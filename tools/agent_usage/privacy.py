"""Private local storage setup for the agent usage ledger.

The selected state directory is secured before the tool writes registry, hook,
queue, setup, or report data.  SQLite receives a private, regular ledger file
before it opens the database.  No process umask is changed.

Windows uses CreateDirectoryW with a SECURITY_ATTRIBUTES descriptor on first
creation, then SetNamedSecurityInfoW to repair existing objects.  Microsoft
documents these contracts at:
https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createdirectoryw
https://learn.microsoft.com/en-us/windows/win32/api/aclapi/nf-aclapi-setnamedsecurityinfow
"""
from __future__ import annotations

import ctypes
import os
import stat
import threading
from pathlib import Path


class PrivacyError(OSError):
    """Raised when local usage data cannot be protected safely."""


_IS_WINDOWS = os.name == "nt"
_WINDOWS_LOCK = threading.RLock()


def _normalise_leaf(value) -> Path:
    """Canonicalise ancestors without following the selected leaf itself."""
    try:
        raw = Path(value).expanduser()
        if not raw.is_absolute():
            raw = Path.cwd() / raw
        raw = Path(os.path.abspath(os.fspath(raw)))
        if not raw.name or raw == Path(raw.anchor):
            raise PrivacyError("The filesystem root cannot be used as agent usage state")
        parent = raw.parent.resolve(strict=False)
        return parent / raw.name
    except PrivacyError:
        raise
    except (OSError, TypeError, ValueError) as exc:
        raise PrivacyError("Could not resolve the selected agent usage path") from exc


def _prepare_parent(path: Path) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.parent.is_dir() or path.parent.resolve(strict=True) != path.parent:
            raise PrivacyError("The parent of the selected agent usage path is not a stable directory")
    except PrivacyError:
        raise
    except OSError as exc:
        raise PrivacyError("Could not create the parent directory for local agent usage state") from exc


def _leaf_stat(path: Path):
    try:
        return path.lstat()
    except FileNotFoundError:
        return None
    except OSError as exc:
        raise PrivacyError("Could not inspect the selected agent usage path") from exc


def _reject_link_or_reparse(path: Path, info) -> None:
    if info is None:
        return
    reparse = getattr(info, "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    if stat.S_ISLNK(info.st_mode) or reparse:
        raise PrivacyError("The selected agent usage path must not be a symbolic link or reparse point")


def _ensure_posix_directory(path: Path) -> None:
    _prepare_parent(path)
    for _ in range(3):
        info = _leaf_stat(path)
        _reject_link_or_reparse(path, info)
        if info is None:
            try:
                # mkdir applies this mode atomically; a restrictive umask can
                # only remove additional bits and is never changed process-wide.
                os.mkdir(path, 0o700)
            except FileExistsError:
                continue
            except OSError as exc:
                raise PrivacyError("Could not create the private agent usage state directory") from exc
        flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
        try:
            fd = os.open(path, flags)
        except OSError as exc:
            raise PrivacyError("Could not safely open the agent usage state directory") from exc
        try:
            opened = os.fstat(fd)
            if not stat.S_ISDIR(opened.st_mode):
                raise PrivacyError("The selected agent usage state path is not a directory")
            os.fchmod(fd, 0o700)
            current = path.lstat()
            _reject_link_or_reparse(path, current)
            if (opened.st_dev, opened.st_ino) != (current.st_dev, current.st_ino):
                raise PrivacyError("The selected agent usage state directory changed while being secured")
        except PrivacyError:
            raise
        except OSError as exc:
            raise PrivacyError("Could not set private permissions on the agent usage state directory") from exc
        finally:
            os.close(fd)
        return
    raise PrivacyError("The agent usage state directory changed repeatedly during initialization")


def _ensure_posix_ledger(path: Path) -> None:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    for _ in range(3):
        info = _leaf_stat(path)
        _reject_link_or_reparse(path, info)
        created = False
        if info is None:
            try:
                # O_EXCL prevents following a pre-existing link, and the mode
                # is restrictive before SQLite can write a byte.
                fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | getattr(os, "O_NOFOLLOW", 0), 0o600)
                created = True
            except FileExistsError:
                continue
            except OSError as exc:
                raise PrivacyError("Could not create the private agent usage ledger") from exc
        else:
            try:
                fd = os.open(path, flags)
            except FileNotFoundError:
                continue
            except OSError as exc:
                raise PrivacyError("Could not safely open the existing agent usage ledger") from exc
        try:
            opened = os.fstat(fd)
            if not stat.S_ISREG(opened.st_mode):
                raise PrivacyError("The agent usage ledger must be a regular file")
            if opened.st_nlink != 1:
                raise PrivacyError("The agent usage ledger must not have additional hard links")
            os.fchmod(fd, 0o600)
            current = path.lstat()
            _reject_link_or_reparse(path, current)
            if (opened.st_dev, opened.st_ino) != (current.st_dev, current.st_ino):
                raise PrivacyError("The agent usage ledger changed while being secured")
        except PrivacyError:
            raise
        except OSError as exc:
            raise PrivacyError("Could not set private permissions on the agent usage ledger") from exc
        finally:
            os.close(fd)
        return
    raise PrivacyError("The agent usage ledger changed repeatedly during initialization")


# Windows declarations intentionally stay local to this module and are loaded
# only on Windows.  Pointer-sized types use ctypes/wintypes rather than fixed
# 32-bit aliases, as required by the native API on 64-bit Python.
def _windows_api():
    if not hasattr(ctypes, "WinDLL"):
        raise PrivacyError("Windows security APIs are unavailable in this Python runtime")
    from ctypes import wintypes

    class _Trustee(ctypes.Structure):
        _fields_ = [
            ("pMultipleTrustee", ctypes.c_void_p),
            ("MultipleTrusteeOperation", ctypes.c_int),
            ("TrusteeForm", ctypes.c_int),
            ("TrusteeType", ctypes.c_int),
            ("ptstrName", ctypes.c_void_p),
        ]

    class _ExplicitAccess(ctypes.Structure):
        _fields_ = [
            ("grfAccessPermissions", wintypes.DWORD),
            ("grfAccessMode", ctypes.c_int),
            ("grfInheritance", wintypes.DWORD),
            ("Trustee", _Trustee),
        ]

    class _TokenUser(ctypes.Structure):
        _fields_ = [("Sid", ctypes.c_void_p), ("Attributes", wintypes.DWORD)]

    class _SecurityDescriptor(ctypes.Structure):
        _fields_ = [
            ("Revision", ctypes.c_byte),
            ("Sbz1", ctypes.c_byte),
            ("Control", wintypes.WORD),
            ("Owner", ctypes.c_void_p),
            ("Group", ctypes.c_void_p),
            ("Sacl", ctypes.c_void_p),
            ("Dacl", ctypes.c_void_p),
        ]

    class _SecurityAttributes(ctypes.Structure):
        _fields_ = [
            ("nLength", wintypes.DWORD),
            ("lpSecurityDescriptor", ctypes.c_void_p),
            ("bInheritHandle", wintypes.BOOL),
        ]

    class _AceHeader(ctypes.Structure):
        _fields_ = [("AceType", ctypes.c_ubyte), ("AceFlags", ctypes.c_ubyte), ("AceSize", wintypes.WORD)]

    class _AclSizeInformation(ctypes.Structure):
        _fields_ = [("AceCount", wintypes.DWORD), ("AclBytesInUse", wintypes.DWORD), ("AclBytesFree", wintypes.DWORD)]

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    advapi = ctypes.WinDLL("advapi32", use_last_error=True)
    handle = wintypes.HANDLE
    void_p = ctypes.c_void_p

    kernel.GetCurrentProcess.argtypes = []
    kernel.GetCurrentProcess.restype = handle
    kernel.CloseHandle.argtypes = [handle]
    kernel.CloseHandle.restype = wintypes.BOOL
    kernel.CreateDirectoryW.argtypes = [wintypes.LPCWSTR, ctypes.POINTER(_SecurityAttributes)]
    kernel.CreateDirectoryW.restype = wintypes.BOOL
    kernel.LocalFree.argtypes = [void_p]
    kernel.LocalFree.restype = void_p

    advapi.OpenProcessToken.argtypes = [handle, wintypes.DWORD, ctypes.POINTER(handle)]
    advapi.OpenProcessToken.restype = wintypes.BOOL
    advapi.GetTokenInformation.argtypes = [handle, ctypes.c_int, void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
    advapi.GetTokenInformation.restype = wintypes.BOOL
    advapi.InitializeSecurityDescriptor.argtypes = [void_p, wintypes.DWORD]
    advapi.InitializeSecurityDescriptor.restype = wintypes.BOOL
    advapi.SetSecurityDescriptorDacl.argtypes = [void_p, wintypes.BOOL, void_p, wintypes.BOOL]
    advapi.SetSecurityDescriptorDacl.restype = wintypes.BOOL
    advapi.SetSecurityDescriptorControl.argtypes = [void_p, wintypes.WORD, wintypes.WORD]
    advapi.SetSecurityDescriptorControl.restype = wintypes.BOOL
    advapi.SetEntriesInAclW.argtypes = [wintypes.ULONG, ctypes.POINTER(_ExplicitAccess), void_p, ctypes.POINTER(void_p)]
    advapi.SetEntriesInAclW.restype = wintypes.DWORD
    advapi.SetNamedSecurityInfoW.argtypes = [wintypes.LPWSTR, ctypes.c_int, wintypes.DWORD, void_p, void_p, void_p, void_p]
    advapi.SetNamedSecurityInfoW.restype = wintypes.DWORD
    advapi.GetNamedSecurityInfoW.argtypes = [
        wintypes.LPWSTR, ctypes.c_int, wintypes.DWORD,
        ctypes.POINTER(void_p), ctypes.POINTER(void_p), ctypes.POINTER(void_p), ctypes.POINTER(void_p), ctypes.POINTER(void_p),
    ]
    advapi.GetNamedSecurityInfoW.restype = wintypes.DWORD
    advapi.GetSecurityDescriptorControl.argtypes = [void_p, ctypes.POINTER(wintypes.WORD), ctypes.POINTER(wintypes.DWORD)]
    advapi.GetSecurityDescriptorControl.restype = wintypes.BOOL
    advapi.GetAclInformation.argtypes = [void_p, void_p, wintypes.DWORD, ctypes.c_int]
    advapi.GetAclInformation.restype = wintypes.BOOL
    advapi.GetAce.argtypes = [void_p, wintypes.DWORD, ctypes.POINTER(void_p)]
    advapi.GetAce.restype = wintypes.BOOL
    advapi.GetLengthSid.argtypes = [void_p]
    advapi.GetLengthSid.restype = wintypes.DWORD

    return {
        "ctypes": ctypes,
        "wintypes": wintypes,
        "kernel": kernel,
        "advapi": advapi,
        "Trustee": _Trustee,
        "ExplicitAccess": _ExplicitAccess,
        "TokenUser": _TokenUser,
        "SecurityDescriptor": _SecurityDescriptor,
        "SecurityAttributes": _SecurityAttributes,
        "AceHeader": _AceHeader,
        "AclSizeInformation": _AclSizeInformation,
    }


def _windows_failure(message: str, code: int) -> PrivacyError:
    return PrivacyError(f"{message} (Windows security API error {code})")


def _windows_sid(api) -> tuple[object, object, bytes]:
    """Return token, owning buffer, and the current process user's SID bytes."""
    c = api["ctypes"]
    w = api["wintypes"]
    token = w.HANDLE()
    if not api["advapi"].OpenProcessToken(api["kernel"].GetCurrentProcess(), 0x0008, c.byref(token)):
        raise _windows_failure("Could not read the current Windows user SID", c.get_last_error())
    size = w.DWORD()
    api["advapi"].GetTokenInformation(token, 1, None, 0, c.byref(size))
    if not size.value:
        code = c.get_last_error()
        api["kernel"].CloseHandle(token)
        raise _windows_failure("Could not determine the current Windows user SID size", code)
    buffer = c.create_string_buffer(size.value)
    if not api["advapi"].GetTokenInformation(token, 1, buffer, size.value, c.byref(size)):
        code = c.get_last_error()
        api["kernel"].CloseHandle(token)
        raise _windows_failure("Could not read the current Windows user SID", code)
    sid = c.cast(buffer, c.POINTER(api["TokenUser"])).contents.Sid
    length = api["advapi"].GetLengthSid(sid)
    if not length:
        code = c.get_last_error()
        api["kernel"].CloseHandle(token)
        raise _windows_failure("The current Windows user SID is invalid", code)
    return token, buffer, c.string_at(sid, length)


def _windows_acl(api, sid, directory: bool):
    c = api["ctypes"]
    entry = api["ExplicitAccess"]()
    entry.grfAccessPermissions = 0x001F01FF  # FILE_ALL_ACCESS for this user only
    entry.grfAccessMode = 2  # SET_ACCESS replaces any broader DACL entries
    entry.grfInheritance = 0x3 if directory else 0  # object + container inheritance
    entry.Trustee.pMultipleTrustee = None
    entry.Trustee.MultipleTrusteeOperation = 0
    entry.Trustee.TrusteeForm = 0  # TRUSTEE_IS_SID
    entry.Trustee.TrusteeType = 1  # TRUSTEE_IS_USER
    entry.Trustee.ptstrName = sid
    acl = c.c_void_p()
    result = api["advapi"].SetEntriesInAclW(1, c.byref(entry), None, c.byref(acl))
    if result:
        raise _windows_failure("Could not build a private Windows DACL", result)
    return acl


def _windows_descriptor(api, acl):
    c = api["ctypes"]
    descriptor = api["SecurityDescriptor"]()
    if not api["advapi"].InitializeSecurityDescriptor(c.byref(descriptor), 1):
        raise _windows_failure("Could not initialize a Windows security descriptor", c.get_last_error())
    if not api["advapi"].SetSecurityDescriptorDacl(c.byref(descriptor), True, acl, False):
        raise _windows_failure("Could not attach the private DACL to a Windows security descriptor", c.get_last_error())
    if not api["advapi"].SetSecurityDescriptorControl(c.byref(descriptor), 0x1000, 0x1000):
        raise _windows_failure("Could not protect the Windows DACL from inheritance", c.get_last_error())
    attributes = api["SecurityAttributes"](c.sizeof(api["SecurityAttributes"]), c.cast(c.byref(descriptor), c.c_void_p), False)
    return descriptor, attributes


def _inspect_windows_acl(path: Path):
    """Return protected flag and ACE tuples for native Windows verification/tests."""
    api = _windows_api()
    c = api["ctypes"]
    w = api["wintypes"]
    dacl = c.c_void_p()
    descriptor = c.c_void_p()
    code = api["advapi"].GetNamedSecurityInfoW(
        str(path), 1, 0x00000004, None, None, c.byref(dacl), None, c.byref(descriptor)
    )
    if code:
        raise _windows_failure("Could not inspect the Windows agent usage DACL", code)
    try:
        control = w.WORD()
        revision = w.DWORD()
        if not api["advapi"].GetSecurityDescriptorControl(descriptor, c.byref(control), c.byref(revision)):
            raise _windows_failure("Could not inspect the Windows security descriptor", c.get_last_error())
        if not dacl.value:
            return bool(control.value & 0x1000), []
        sizes = api["AclSizeInformation"]()
        if not api["advapi"].GetAclInformation(dacl, c.byref(sizes), c.sizeof(sizes), 2):
            raise _windows_failure("Could not inspect the Windows DACL entries", c.get_last_error())
        entries = []
        for index in range(sizes.AceCount):
            ace = c.c_void_p()
            if not api["advapi"].GetAce(dacl, index, c.byref(ace)):
                raise _windows_failure("Could not inspect a Windows DACL entry", c.get_last_error())
            header = c.cast(ace, c.POINTER(api["AceHeader"])).contents
            if header.AceType != 0 or header.AceSize < 8:
                entries.append((header.AceType, header.AceFlags, None, None))
                continue
            address = c.cast(ace, c.c_void_p).value
            mask = c.cast(address + 4, c.POINTER(w.DWORD)).contents.value
            sid = c.c_void_p(address + 8)
            sid_length = api["advapi"].GetLengthSid(sid)
            if not sid_length or header.AceSize < 8 + sid_length:
                entries.append((header.AceType, header.AceFlags, mask, None))
            else:
                entries.append((header.AceType, header.AceFlags, mask, c.string_at(sid, sid_length)))
        return bool(control.value & 0x1000), entries
    finally:
        api["kernel"].LocalFree(descriptor)


def _windows_acl_matches(path: Path, directory: bool, sid_bytes: bytes) -> bool:
    try:
        protected, entries = _inspect_windows_acl(path)
    except PrivacyError:
        raise
    expected_flags = 0x3 if directory else 0
    return protected and entries == [(0, expected_flags, 0x001F01FF, sid_bytes)]


def _set_windows_acl(api, path: Path, acl) -> None:
    information = 0x00000004 | 0x80000000  # DACL_SECURITY_INFORMATION | PROTECTED_DACL_SECURITY_INFORMATION
    result = api["advapi"].SetNamedSecurityInfoW(str(path), 1, information, None, None, acl, None)
    if result:
        raise _windows_failure("Could not protect the Windows agent usage path", result)


def _ensure_windows_directory(path: Path) -> None:
    _prepare_parent(path)
    info = _leaf_stat(path)
    _reject_link_or_reparse(path, info)
    if info is not None and not stat.S_ISDIR(info.st_mode):
        raise PrivacyError("The selected agent usage state path is not a directory")
    api = _windows_api()
    token = buffer = acl = None
    try:
        token, buffer, sid_bytes = _windows_sid(api)
        sid = api["ctypes"].cast(buffer, api["ctypes"].POINTER(api["TokenUser"])).contents.Sid
        acl = _windows_acl(api, sid, True)
        descriptor, attributes = _windows_descriptor(api, acl)
        if info is None:
            if not api["kernel"].CreateDirectoryW(str(path), api["ctypes"].byref(attributes)):
                error = api["ctypes"].get_last_error()
                if error != 183:  # ERROR_ALREADY_EXISTS: another initializer won the race
                    raise _windows_failure("Could not create the private agent usage state directory", error)
                info = _leaf_stat(path)
                _reject_link_or_reparse(path, info)
                if info is None or not stat.S_ISDIR(info.st_mode):
                    raise PrivacyError("The agent usage state path was replaced during initialization")
        with _WINDOWS_LOCK:
            if not _windows_acl_matches(path, True, sid_bytes):
                _set_windows_acl(api, path, acl)
            if not _windows_acl_matches(path, True, sid_bytes):
                raise PrivacyError("Windows did not retain the private DACL on the agent usage state directory")
    finally:
        if acl:
            api["kernel"].LocalFree(acl)
        if token:
            api["kernel"].CloseHandle(token)


def _ensure_windows_ledger(path: Path) -> None:
    info = _leaf_stat(path)
    _reject_link_or_reparse(path, info)
    if info is not None:
        if not stat.S_ISREG(info.st_mode):
            raise PrivacyError("The agent usage ledger must be a regular file")
        if info.st_nlink != 1:
            raise PrivacyError("The agent usage ledger must not have additional hard links")
    else:
        try:
            # The parent has a protected inheritable DACL, so even this empty
            # file is user-only before we apply and verify its explicit DACL.
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except FileExistsError:
            info = _leaf_stat(path)
            _reject_link_or_reparse(path, info)
            if info is None:
                raise PrivacyError("The agent usage ledger changed repeatedly during initialization")
        except OSError as exc:
            raise PrivacyError("Could not create the private agent usage ledger") from exc
        else:
            os.close(fd)
            info = _leaf_stat(path)
    if info is None or not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
        raise PrivacyError("The agent usage ledger must be a single regular file")
    api = _windows_api()
    token = buffer = acl = None
    try:
        token, buffer, sid_bytes = _windows_sid(api)
        sid = api["ctypes"].cast(buffer, api["ctypes"].POINTER(api["TokenUser"])).contents.Sid
        acl = _windows_acl(api, sid, False)
        with _WINDOWS_LOCK:
            if not _windows_acl_matches(path, False, sid_bytes):
                _set_windows_acl(api, path, acl)
            if not _windows_acl_matches(path, False, sid_bytes):
                raise PrivacyError("Windows did not retain the private DACL on the agent usage ledger")
    finally:
        if acl:
            api["kernel"].LocalFree(acl)
        if token:
            api["kernel"].CloseHandle(token)


def ensure_private_state(state_dir) -> Path:
    """Create or repair only the selected state directory and return its path."""
    path = _normalise_leaf(state_dir)
    if path == Path(path.anchor):
        raise PrivacyError("The filesystem root cannot be used as agent usage state")
    if _IS_WINDOWS:
        _ensure_windows_directory(path)
    else:
        _ensure_posix_directory(path)
    return path


def ensure_private_ledger(state_dir, ledger_path=None) -> Path:
    """Secure the selected state directory and its regular ledger file."""
    state = ensure_private_state(state_dir)
    path = _normalise_leaf(ledger_path if ledger_path is not None else state / "ledger.sqlite3")
    if path.parent != state:
        raise PrivacyError("The agent usage ledger must be directly inside the selected state directory")
    _reject_link_or_reparse(path, _leaf_stat(path))
    if _IS_WINDOWS:
        _ensure_windows_ledger(path)
    else:
        _ensure_posix_ledger(path)
    return path
