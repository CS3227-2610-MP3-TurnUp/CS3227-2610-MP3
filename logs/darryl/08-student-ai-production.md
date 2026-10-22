# 01 - Enable Student AI in Production - 22 October 2026

## Request

Darryl requests Production Student chat,push and merge for full-project testing. Clarified via direct reply:separateProduction200attemptpoolwithsamePreviewlimits,notasharedcross-environmentcounter. PreservePreviewusage,Student/Organiserkeyisolation,localworkandmain-agent-onlyscope. NoagentliveinferenceorlimitincreasebeyondtheexplicitnewProductionpool.

## Results

ImplementedintheexistingWP006worktree;fast-forwardedorigin/mastere230b39(themergedPR28),preservinglocalstagednext-envandregistrationdiagnostics. NewPRincrementreusesD006andthisownerlog08;priorlog07evidenceretained. ProductionkeymustbeaddedprivatelyinVercelProduction;agentwillnotread/copyProductioncredentials. Existingprotectedmigration/candidate/promotionworkflowremainsinforce. Policy/routes/keytests30passed;two-disposabledatabaseSQL20passed;types/lint/schemaand12workflowmultilinescriptsyntaxcheckspassed. Previewcountersremainuntouched;Productionhasdistinctapprovalandpool. Noagentliveinference. Authorisedpublish/merge/ProductionruntimeoutcomespendingGitHubexecution.

<!-- turnup-prompt:v1 -->
```json
{
  "version": 1,
  "entry": 1,
  "root_thread_id": null,
  "root_turn_id": null,
  "revision": "e230b39",
  "captured_at": null,
  "delegation": "Explicit main-agent-only instruction retained;no subagents.",
  "agents": [
    {
      "id": "/root",
      "parent": null,
      "thread_id": null,
      "action": "root",
      "role": "main",
      "task": "Enable Student Production Q&A with separately approved200attemptpool,test,push/merge/deploythroughprotectedworkflow.",
      "reason": null,
      "dispatches": 0,
      "outcome": "completed",
      "result": "ImplementedapprovedseparateProduction200poolandguardedactivationwith30mocked/20disposableSQLchecks,types/lint/schema/shellvalidationpassed.ReadyforauthorisedPR/merge/deploy;actualoperationaloutcomespending.Noagentliveinferenceorprivatesecretread.",
      "settings": {
        "model": null,
        "effort": null,
        "basis": "unknown"
      },
      "tokens": {
        "status": "unavailable",
        "responses": null,
        "input": null,
        "cached_input": null,
        "output": null,
        "reasoning_output": null,
        "total": null,
        "source": null,
        "note": "Prompt-scoped telemetry unavailable;root active."
      }
    }
  ],
  "usage_updates": []
}
```

### Deployment fixture correction before merge

PR29createdfrom638efef;initialPRworkflow39793069767failedthreeexistinghosting/vercel-outputassertionsaftertheadditionalStudentcandidatecurl. CorrectedthefixturetoprovidetheRUNNER_TEMPdirectory,modelaseparatesourceHTTPresponse/body,preservetheoriginalrootcredentialassertionandexecutetherealStudentresponsevalidator. Addedstrictpromotiondenialcasesfor404,platformHTML,wrong401/403codeandunexpected200;correct401/403areacceptedwithoutinference. Thefirstlocalrunhit29legacyCRLFparserfailures;normalisedworkflowlineendingsinthetestreader.Finalaffectedhostingtest30/30passed;types/scopedlintrechecked. Nopromotionguardweakened,network/providercallorbudgetreset. UserconfirmedSTUDENT_SOCLAAS_API_KEYsavedforProduction. PublishcorrectionandrerunactualGitHubchecks before requestedmerge.
