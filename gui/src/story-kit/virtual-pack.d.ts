/** What `.storybook/pack.ts` answers: the resource pack named to the local Storybook, each
 * picture's PNG in base64 and each data file's text by name, or null without one. */
declare module "virtual:abth-story-pack" {
  const pack: {
    readonly label: string;
    readonly pictures: Readonly<Record<string, string>>;
    readonly data: Readonly<Record<string, string>>;
  } | null;
  export default pack;
}
