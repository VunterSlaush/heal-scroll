/** Injectable time source so use-cases stay deterministic in tests. */
export type Clock = () => Date;
