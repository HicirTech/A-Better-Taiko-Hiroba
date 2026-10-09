// The pipelines a shell sends its requests through.

export { EXTERNAL_READ_CONSUMERS, IO_READ_CONSUMERS } from "./consumers";
export { type CodedFailure, resultFailure } from "./failure";
export {
  createPipeline,
  type EndedAt,
  type EndedGroup,
  type GroupAsked,
  type GroupKind,
  type GroupNow,
  type Pipeline,
  type PipelineOptions,
  type SentRequest,
} from "./pipeline";
export {
  createMemoryPipelineStore,
  createPipelineLog,
  KEPT_GROUPS,
  type PictureTally,
  type PipelineHistory,
  type PipelineHistoryStore,
  type PipelineLog,
  type PipelineLogOptions,
  readPipelineHistory,
} from "./pipeline-log";
