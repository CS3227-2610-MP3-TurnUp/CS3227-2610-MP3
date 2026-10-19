import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const txQueryRaw = vi.fn();
  const txExecuteRaw = vi.fn();
  const releaseExecuteRaw = vi.fn();
  const transaction = vi.fn(
    async (callback: (tx: { $queryRaw: typeof txQueryRaw; $executeRaw: typeof txExecuteRaw }) => Promise<unknown>) =>
      callback({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
  );

  return {
    txQueryRaw,
    txExecuteRaw,
    releaseExecuteRaw,
    transaction,
    state: {
      attempt_count: 0n,
      in_flight_count: 0n,
      reserved_output_tokens: 0n,
      max_attempts_limit: null as bigint | null,
      max_in_flight_limit: null as bigint | null,
      min_interval_ms: null as bigint | null,
      output_token_budget: null as bigint | null,
      interval_elapsed: true,
    },
  };
});

vi.mock("../../src/server/db/client", () => ({
  prisma: {
    $transaction: database.transaction,
    $executeRaw: database.releaseExecuteRaw,
  },
}));
vi.mock("server-only", () => ({}));

const limits = {
  maxAttempts: 8,
  maxInFlight: 3,
  minIntervalMs: 250,
  outputTokenBudget: 2_000,
};
const reservationId = "b8b6aa9f-9548-4f1c-a90c-855e90fb7e5a";
const originalDatabaseEnvironment = process.env.DATABASE_ENVIRONMENT;

describe("shared SoC probe gate", () => {
  let gate: typeof import("../../src/server/db/soc-probe-gate");

  beforeEach(async () => {
    vi.resetModules();
    process.env.DATABASE_ENVIRONMENT = "non-production";
    Object.assign(database.state, {
      attempt_count: 0n,
      in_flight_count: 0n,
      reserved_output_tokens: 0n,
      max_attempts_limit: null,
      max_in_flight_limit: null,
      min_interval_ms: null,
      output_token_budget: null,
      interval_elapsed: true,
    });
    database.txQueryRaw.mockReset();
    database.txExecuteRaw.mockReset();
    database.releaseExecuteRaw.mockReset();
    database.transaction.mockReset();
    database.transaction.mockImplementation(async (callback) =>
      callback({ $queryRaw: database.txQueryRaw, $executeRaw: database.txExecuteRaw }),
    );
    database.txQueryRaw.mockImplementation(async (...args: unknown[]) => {
      const [template] = args as [TemplateStringsArray, ...unknown[]];
      const sql = template.join(" ");
      if (sql.includes("FOR UPDATE")) {
        return [
          {
            attempt_count: database.state.attempt_count,
            in_flight_count: database.state.in_flight_count,
            reserved_output_tokens: database.state.reserved_output_tokens,
            max_attempts_limit: database.state.max_attempts_limit,
            max_in_flight_limit: database.state.max_in_flight_limit,
            min_interval_ms: database.state.min_interval_ms,
            output_token_budget: database.state.output_token_budget,
          },
        ];
      }
      return [{ interval_elapsed: database.state.interval_elapsed }];
    });
    database.txExecuteRaw.mockImplementation(async (...args: unknown[]) => {
      const [template, ...parameters] = args as [TemplateStringsArray, ...unknown[]];
      const sql = template.join(" ");
      if (sql.includes('UPDATE "soc_probe_gate"')) {
        const [attemptIncrement, inFlightIncrement, tokenIncrement, tokenCount, timeIncrement,
          maxAttempts, maxInFlight, minIntervalMs, outputTokenBudget] = parameters;
        if (attemptIncrement === true) database.state.attempt_count += 1n;
        if (inFlightIncrement === true) database.state.in_flight_count += 1n;
        if (tokenIncrement === true) database.state.reserved_output_tokens += tokenCount as bigint;
        if (typeof timeIncrement !== "boolean") {
          throw new Error("Expected boolean admission timestamp flag.");
        }
        database.state.max_attempts_limit = maxAttempts as bigint;
        database.state.max_in_flight_limit = maxInFlight as bigint;
        database.state.min_interval_ms = minIntervalMs as bigint;
        database.state.output_token_budget = outputTokenBudget as bigint;
        return 1;
      }
      if (sql.includes('INSERT INTO "soc_probe_reservation"')) return 1;
      return 0;
    });
    gate = await import("../../src/server/db/soc-probe-gate");
  });

  afterEach(() => {
    if (originalDatabaseEnvironment === undefined) {
      delete process.env.DATABASE_ENVIRONMENT;
    } else {
      process.env.DATABASE_ENVIRONMENT = originalDatabaseEnvironment;
    }
  });

  it("uses the locked singleton row, database clock, one update, and a unique lease", async () => {
    const result = await gate.admitSoCProbe(limits, 512);
    expect(result.status).toBe("admitted");
    expect(database.transaction).toHaveBeenCalledOnce();
    expect(database.txQueryRaw).toHaveBeenCalledTimes(2);
    expect(database.txExecuteRaw).toHaveBeenCalledTimes(2);

    const [lockTemplate] = database.txQueryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(lockTemplate.join(" ")).toContain("FOR UPDATE");
    const [intervalTemplate, intervalMs] = database.txQueryRaw.mock.calls[1] as [
      TemplateStringsArray,
      number,
    ];
    expect(intervalTemplate.join(" ")).toContain("clock_timestamp()");
    expect(intervalTemplate.join(" ")).toContain("make_interval");
    expect(intervalMs).toBe(limits.minIntervalMs);

    const updateCall = database.txExecuteRaw.mock.calls.find(([template]) =>
      (template as TemplateStringsArray).join(" ").includes('UPDATE "soc_probe_gate"'),
    );
    expect(updateCall).toBeDefined();
    const updateSql = (updateCall?.[0] as TemplateStringsArray).join(" ");
    expect(updateSql.match(/UPDATE "soc_probe_gate"/g)).toHaveLength(1);
    expect(updateSql).toContain('"max_attempts_limit"');
    expect(updateSql).toContain('"max_in_flight_limit"');
    expect(updateSql).toContain('"min_interval_ms"');
    expect(updateSql).toContain('"output_token_budget"');
    expect(database.state).toMatchObject({
      attempt_count: 1n,
      in_flight_count: 1n,
      reserved_output_tokens: 512n,
      max_attempts_limit: 8n,
      max_in_flight_limit: 3n,
      min_interval_ms: 250n,
      output_token_budget: 2_000n,
    });

    const insertCall = database.txExecuteRaw.mock.calls.find(([template]) =>
      (template as TemplateStringsArray).join(" ").includes('INSERT INTO "soc_probe_reservation"'),
    );
    expect(result).toEqual({
      status: "admitted",
      reservationId: insertCall?.[1],
    });
  });

  it("latches tighter limits even when their request is denied, and later values cannot loosen them", async () => {
    Object.assign(database.state, {
      attempt_count: 2n,
      in_flight_count: 0n,
      reserved_output_tokens: 40n,
      max_attempts_limit: 8n,
      max_in_flight_limit: 3n,
      min_interval_ms: 250n,
      output_token_budget: 2_000n,
    });
    const tighter = {
      maxAttempts: 2,
      maxInFlight: 1,
      minIntervalMs: 400,
      outputTokenBudget: 100,
    };

    // Individually valid tighter fields are accepted by the helper. The
    // complete request budget does not fit, so policy commits but no lease does.
    await expect(gate.admitSoCProbe(tighter, 101)).resolves.toEqual({ status: "limited" });
    expect(database.state).toMatchObject({
      attempt_count: 2n,
      in_flight_count: 0n,
      reserved_output_tokens: 40n,
      max_attempts_limit: 2n,
      max_in_flight_limit: 1n,
      min_interval_ms: 400n,
      output_token_budget: 100n,
    });
    expect(database.txExecuteRaw.mock.calls).toHaveLength(1);

    await expect(gate.admitSoCProbe(limits, 25)).resolves.toEqual({ status: "limited" });
    expect(database.state).toMatchObject({
      max_attempts_limit: 2n,
      max_in_flight_limit: 1n,
      min_interval_ms: 400n,
      output_token_budget: 100n,
    });
    expect(database.txExecuteRaw.mock.calls).toHaveLength(2);
  });

  it("merges each policy dimension independently and keeps the stricter prior values", async () => {
    Object.assign(database.state, {
      max_attempts_limit: 4n,
      max_in_flight_limit: 6n,
      min_interval_ms: 900n,
      output_token_budget: 3_000n,
    });
    const incoming = {
      maxAttempts: 7,
      maxInFlight: 2,
      minIntervalMs: 300,
      outputTokenBudget: 1_500,
    };

    await gate.admitSoCProbe(incoming, 100);
    expect(database.state).toMatchObject({
      max_attempts_limit: 4n,
      max_in_flight_limit: 2n,
      min_interval_ms: 900n,
      output_token_budget: 1_500n,
    });
  });

  it("returns limited when the database-clock interval has not elapsed", async () => {
    database.state.interval_elapsed = false;
    await expect(gate.admitSoCProbe(limits, 512)).resolves.toEqual({ status: "limited" });
    expect(database.state).toMatchObject({
      attempt_count: 0n,
      in_flight_count: 0n,
      reserved_output_tokens: 0n,
      max_attempts_limit: 8n,
      max_in_flight_limit: 3n,
      min_interval_ms: 250n,
      output_token_budget: 2_000n,
    });
    expect(database.txExecuteRaw).toHaveBeenCalledOnce();
  });

  it("fails closed when the singleton gate row is missing", async () => {
    database.txQueryRaw.mockResolvedValueOnce([]);
    await expect(gate.admitSoCProbe(limits, 512)).rejects.toThrow("gate row is missing");
    expect(database.txExecuteRaw).not.toHaveBeenCalled();
  });

  it("fails closed when a stored policy is only partially initialized", async () => {
    database.state.max_attempts_limit = 5n;
    await expect(gate.admitSoCProbe(limits, 512)).rejects.toThrow("durable policy is incomplete");
    expect(database.txExecuteRaw).not.toHaveBeenCalled();
  });

  it("propagates transaction database failures so callers fail closed", async () => {
    database.txQueryRaw.mockRejectedValueOnce(new Error("synthetic database failure"));
    await expect(gate.admitSoCProbe(limits, 512)).rejects.toThrow("synthetic database failure");
  });

  it("rejects malformed numeric values but permits independently stricter valid settings", async () => {
    await expect(gate.admitSoCProbe({ ...limits, maxAttempts: 0 }, 512)).rejects.toThrow(
      "maxAttempts must be a positive safe integer",
    );
    await expect(gate.admitSoCProbe({ ...limits, maxInFlight: 0 }, 512)).rejects.toThrow(
      "maxInFlight must be a positive safe integer",
    );
    await expect(gate.admitSoCProbe(limits, 0)).rejects.toThrow(
      "outputTokens must be a positive safe integer",
    );
    expect(database.transaction).not.toHaveBeenCalled();

    await expect(
      gate.admitSoCProbe({ ...limits, maxAttempts: 1, maxInFlight: 4, outputTokenBudget: 10 }, 11),
    ).resolves.toEqual({ status: "limited" });
  });

  it("requires a non-production database label", async () => {
    process.env.DATABASE_ENVIRONMENT = "production";
    await expect(gate.admitSoCProbe(limits, 512)).rejects.toThrow(
      "requires a non-production database label",
    );
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("releases only the supplied UUID lease, making duplicate release a database no-op", async () => {
    database.releaseExecuteRaw.mockResolvedValue(0);
    await gate.releaseSoCProbe(reservationId);
    await gate.releaseSoCProbe(reservationId);

    expect(database.releaseExecuteRaw).toHaveBeenCalledTimes(2);
    const [template, ...parameters] = database.releaseExecuteRaw.mock.calls[0] as [
      TemplateStringsArray,
      ...unknown[],
    ];
    const sql = template.join(" ");
    expect(sql).toContain('DELETE FROM "soc_probe_reservation"');
    expect(sql).toContain("RETURNING");
    expect(sql).toContain('UPDATE "soc_probe_gate"');
    expect(sql).toContain('"in_flight_count" > 0');
    expect(parameters).toContain(reservationId);
  });

  it("does not query the database for invalid reservation IDs", async () => {
    await expect(gate.releaseSoCProbe("not-a-uuid")).rejects.toThrow("must be a UUID");
    expect(database.releaseExecuteRaw).not.toHaveBeenCalled();
  });

  it("propagates release database failures", async () => {
    database.releaseExecuteRaw.mockRejectedValueOnce(new Error("synthetic release failure"));
    await expect(gate.releaseSoCProbe(reservationId)).rejects.toThrow("synthetic release failure");
  });
});
