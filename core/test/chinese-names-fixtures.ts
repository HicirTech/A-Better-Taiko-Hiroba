export const songbox = (official: string) =>
  `{{Songbox\n|released = [[2004年]]\n|id = 10tai\n|official = ${official}\n|default = Tentai Kansoku\n|genre = POPS\n}}\n'''本文'''`;

export const page = (title: string, content: string) => ({
  title,
  revisions: [{ slots: { main: { contentmodel: "wikitext", content } } }],
});

export const batch = (pages: unknown[], next?: Record<string, string>) =>
  JSON.stringify({
    batchcomplete: true,
    ...(next === undefined ? {} : { continue: next }),
    query: { pages },
  });
