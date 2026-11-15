import { v7 as uuidv7 } from "uuid";

type IdPrefix = "panel" | "group";

/** Generic utility to generate a unique id with a `prefix` */
export const newId = <P extends IdPrefix>(prefix: P): `${P}-${string}` =>
  `${prefix}-${uuidv7()}`;

export const newPanelId = () => newId("panel");
export const newGroupId = () => newId("group");
