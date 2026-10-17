/** What `.storybook/pack.ts` answers: the pack's pictures and data files, or null. */
declare module "virtual:abth-story-pack" {
  const pack: {
    readonly label: string;
    readonly pictures: Readonly<Record<string, string>>;
    readonly data: Readonly<Record<string, string>>;
  } | null;
  export default pack;
}
