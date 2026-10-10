/** Read groups Hiroba's IO pipeline runs at once. */
export const IO_READ_CONSUMERS = 5;

/** Pages of Hiroba's play history read at once, in a pipeline of their own. */
export const HISTORY_READ_CONSUMERS = 3;

/** Read groups the pipeline for every other site runs at once. */
export const EXTERNAL_READ_CONSUMERS = 5;
