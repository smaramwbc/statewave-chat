import type { ChatErrorCode, SubjectWarning } from "./types.js";

export class ChatCoreError extends Error {
  readonly code: ChatErrorCode;
  readonly warning: boolean;
  readonly unknownCitationIds?: string[];
  readonly subjectWarnings?: SubjectWarning[];

  constructor(
    code: ChatErrorCode,
    message: string,
    opts?: {
      warning?: boolean;
      unknownCitationIds?: string[];
      subjectWarnings?: SubjectWarning[];
      cause?: unknown;
    },
  ) {
    super(message, opts?.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "ChatCoreError";
    this.code = code;
    this.warning = opts?.warning ?? false;
    this.unknownCitationIds = opts?.unknownCitationIds;
    this.subjectWarnings = opts?.subjectWarnings;
  }
}
