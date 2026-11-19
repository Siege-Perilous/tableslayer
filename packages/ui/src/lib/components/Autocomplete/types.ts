import type { OffsetOptions, Placement } from '@floating-ui/dom';
import type { Snippet } from 'svelte';
import type { HTMLInputAttributes } from 'svelte/elements';

export type AutocompleteOption = {
  value: string;
  label: string;
  /** Options with the same group, given one after another, are listed under it as a heading. */
  group?: string;
  /** A second, quieter line of text beside the label. It is searched as the label is. */
  description?: string;
  disabled?: boolean;
  /** A colour for the option's pill once it is chosen: any CSS colour. Text over a hex colour is made to contrast. */
  color?: string;
  [key: string]: unknown;
};

/** The options to choose from, or a function that finds those matching what has been typed. */
export type AutocompleteSource = AutocompleteOption[] | ((query: string) => Promise<AutocompleteOption[]>);

export type AutocompleteProps = {
  options: AutocompleteSource;
  /** The values chosen: one at most unless `multiple`. */
  selected: string[];
  onSelectedChange?: (selected: string[]) => void;
  multiple?: boolean;
  /** With one choice, shows it as plain text in the field and not as a pill. For a table cell or a tight form. */
  plainText?: boolean;
  variant?: 'default' | 'transparent';
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** What has been typed to search with. It is never the name of what is chosen. */
  query?: string;
  onQueryChange?: (query: string) => void;
  isOpen?: boolean;
  onIsOpenChange?: (open: boolean) => void;
  /**
   * Lets text that matches no option be made into one: on Enter, on the row that offers it,
   * on leaving the field, or at each `delimiter`. The function is given the text and returns
   * the option made of it, which is then chosen; returning nothing turns the text down.
   */
  onCreate?: (text: string) => AutocompleteOption | void | Promise<AutocompleteOption | void>;
  /** The wording of the row that offers it. */
  createLabel?: (text: string) => string;
  /** Whether there is a button that clears what is chosen, and Backspace may take a single choice away. On unless turned off. */
  clearable?: boolean;
  /** Decides whether an option matches what has been typed, in place of looking for the text in its label and description. */
  filter?: (option: AutocompleteOption, query: string) => boolean;
  /** Whether capitals matter in matching. */
  caseSensitive?: boolean;
  /** `startsWith` lists the options that begin with the text before those that only hold it. */
  sortMatchesBy?: 'none' | 'startsWith';
  /** A character that ends an option as it is typed or pasted, usually a comma: "a, b, c" pasted is three choices. */
  delimiter?: string;
  /** No list at all: the field only takes what is typed, with `onCreate`. */
  noSuggestions?: boolean;
  /** Shows the list as busy, for options being fetched by the caller. A function given as `options` does this itself. */
  loading?: boolean;
  /** How long to wait after typing stops before asking a function for options, in milliseconds. */
  debounce?: number;
  /** Said when there are no options at all. */
  emptyText?: string;
  /** Said when the text typed matches none. */
  noMatchText?: (text: string) => string;
  /** Said when every option has been chosen. */
  allSelectedText?: string;
  /** Said when the text typed names an option already chosen. */
  alreadyAddedText?: (label: string) => string;
  loadingText?: string;
  /** Shown before the text field, inside it. */
  start?: Snippet;
  /** How one option is drawn, in place of its label and description. */
  option?: Snippet<[{ option: AutocompleteOption; isActive: boolean; isSelected: boolean; query: string }]>;
  positioning?: {
    placement?: Placement;
    offset?: OffsetOptions;
  };
  element?: HTMLInputElement;
} & Omit<HTMLInputAttributes, 'value' | 'size' | 'disabled'>;
