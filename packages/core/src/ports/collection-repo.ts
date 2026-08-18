import type { Card } from '../entities/card';
import type { Collection } from '../entities/collection';

export interface CollectionRepo {
  createCollection(name: string, at: Date): Promise<number>;
  deleteCollection(collectionId: number): Promise<void>;
  listCollections(): Promise<Collection[]>;
  addItem(collectionId: number, cardId: string, at: Date): Promise<void>;
  removeItem(collectionId: number, cardId: string): Promise<void>;
  getItems(collectionId: number): Promise<Card[]>;
}
