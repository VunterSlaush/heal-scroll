CREATE TABLE `interaction_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` text NOT NULL,
	`type` text NOT NULL,
	`value` real,
	`at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `interaction_log_at_idx` ON `interaction_log` (`at`);--> statement-breakpoint
CREATE INDEX `interaction_log_item_idx` ON `interaction_log` (`item_id`);--> statement-breakpoint
CREATE TABLE `item_embeddings` (
	`item_id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`dim` integer NOT NULL,
	`vector` blob NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `item_embeddings_model_idx` ON `item_embeddings` (`model`);--> statement-breakpoint
CREATE TABLE `taste_centroids` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`topic_id` text,
	`model` text NOT NULL,
	`dim` integer NOT NULL,
	`vector` blob NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`label` text,
	`updated_at` integer NOT NULL
);
