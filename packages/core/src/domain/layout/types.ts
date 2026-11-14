// TODO: consider moving these types in the data model
export type PanelId = `panel-${string}`;
export type GroupId = `group-${string}`;
export type WorkspaceId = `workspace-${string}`;

export type StoryId = string;
export type DocumentId = string;
export type EntityId = string;
export type CollectionId = string;
export type MapId = string;

/** The axis followed by a `PanelGroup` */
export type Axis = "horizontal" | "vertical";

/** The type of view that populates a `PanelNode` */
export type PanelView =
  | { type: "empty" }
  | { type: "document"; documentId: DocumentId }
  | { type: "entity"; entityId: EntityId }
  | { type: "collection"; collectionId: CollectionId }
  | { type: "gallery" }
  | { type: "documentIndex" } // TODO: make the document index a fixed panel?
  | { type: "timeline" }
  | { type: "graph" }
  | { type: "map"; mapId: MapId };

// -- Panel tree layout --
interface BaseNode {
  id: string;
  size: number;
}

/** A leaf in a `LayoutNode` tree */
export interface PanelNode extends BaseNode {
  kind: "panel";
  id: PanelId;
  view: PanelView;
  slavePanelId?: PanelId;
}

/** A father node (and never a leaf) in a `LayoutNode` tree */
export interface GroupNode extends BaseNode {
  kind: "group";
  id: GroupId;
  axis: Axis;
  /** At least two, as it would be a `PanelNode` otherwise */
  children: LayoutNode[];
}

export type LayoutNode = GroupNode | PanelNode;
