CREATE TABLE `fetch_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`ok` integer NOT NULL,
	`card_count` integer DEFAULT 0 NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`image_url` text,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`published_at` text,
	`hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_hash_unique` ON `items` (`hash`);--> statement-breakpoint
CREATE INDEX `items_topic_created_idx` ON `items` (`topic_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_items` (
	`item_id` text PRIMARY KEY NOT NULL,
	`seen_at` integer,
	`saved` integer DEFAULT false NOT NULL,
	`vote` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
