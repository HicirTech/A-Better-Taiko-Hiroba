/** The worn title by name, as no page gives its id back; `""` is no title, a normal state. */
export interface TitleState {
  readonly title: string;
}

export interface TitleOption {
  readonly id: number;
  /** The name as the list writes it, whitespace as the page gives it. */
  readonly label: string;
}

/** The name a player goes by, as my page prints it, trimmed. */
export interface NameState {
  readonly nickname: string;
}
