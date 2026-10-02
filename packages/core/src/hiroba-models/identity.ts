/**
 * What a player prints on their title plate: the title they wear and the name they go by, and the
 * titles they may pick from. Hiroba changes the two through one endpoint (wiki: Writing Titles and
 * Name), which reads and writes each as the text it shows.
 */

/**
 * The title a player wears, by its name: no page gives the worn title's id back, and 13 names
 * repeat across 32 of the 233 titles one account owned, so a name is all there is to compare.
 *
 * My page and the title page print the same name with its spaces in different forms (a
 * non-breaking space on one, an ordinary one on the other), so two titles are the same when they
 * read the same once their whitespace is made one space. `""` is no title, a normal state.
 */
export interface TitleState {
  readonly title: string;
}

/** One title the account owns, as the title page's list offers it: its id, and its name. */
export interface TitleOption {
  readonly id: number;
  /** The name as the list writes it, whitespace as the page gives it. */
  readonly label: string;
}

/** The name a player goes by, as my page prints it, trimmed. */
export interface NameState {
  readonly nickname: string;
}
