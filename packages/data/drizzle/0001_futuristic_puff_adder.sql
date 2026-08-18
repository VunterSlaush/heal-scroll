CREATE TABLE `collection_items` (
	`collection_id` integer NOT NULL,
	`item_id` text NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_items_pk` ON `collection_items` (`collection_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recall_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` text NOT NULL,
	`shown_at` integer NOT NULL,
	`remembered` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`planned_count` integer NOT NULL,
	`seen_count` integer DEFAULT 0 NOT NULL,
	`respected_cooldown` integer
);
--> statement-breakpoint
CREATE TABLE `topic_sources` (
	`topic_id` text NOT NULL,
	`source_id` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`last_fetched_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topic_sources_pk` ON `topic_sources` (`topic_id`,`source_id`);--> statement-breakpoint
ALTER TABLE `items` ADD `series_id` text;--> statement-breakpoint
ALTER TABLE `items` ADD `series_index` integer;--> statement-breakpoint
ALTER TABLE `items` ADD `series_count` integer;--> statement-breakpoint
CREATE INDEX `items_series_idx` ON `items` (`series_id`);--> statement-breakpoint
ALTER TABLE `topics` ADD `enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `topics` ADD `weight` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_items` ADD `saved_at` integer;