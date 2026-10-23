import { defineConfig } from "vitest/config";
export default defineConfig({test:{environment:"node",include:["tests/student-assistant/publication-sql.integration.test.ts","tests/student-assistant/hosted-admission.integration.test.ts"],exclude:[],fileParallelism:false,maxWorkers:1,testTimeout:30000,hookTimeout:30000}});
