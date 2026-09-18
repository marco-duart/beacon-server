CREATE TABLE `event_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`system_id` integer NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`processed_at` integer,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_queue_status_idx` ON `event_queue` (`status`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issue_id` integer NOT NULL,
	`system_id` integer NOT NULL,
	`message` text NOT NULL,
	`stacktrace` text,
	`environment` text,
	`release` text,
	`tags` text,
	`extra` text,
	`timestamp` integer NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_issue_idx` ON `events` (`issue_id`);--> statement-breakpoint
CREATE INDEX `events_system_timestamp_idx` ON `events` (`system_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`system_id` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`level` text NOT NULL,
	`environment` text,
	`release` text,
	`status` text DEFAULT 'open' NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `issues_system_fingerprint_idx` ON `issues` (`system_id`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `issues_system_status_idx` ON `issues` (`system_id`,`status`);--> statement-breakpoint
CREATE INDEX `issues_last_seen_idx` ON `issues` (`last_seen`);--> statement-breakpoint
CREATE TABLE `systems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`api_key_hash` text NOT NULL,
	`api_key_prefix` text NOT NULL,
	`retention_policy` text DEFAULT 'unlimited' NOT NULL,
	`notify_emails` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `systems_slug_unique` ON `systems` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `systems_api_key_hash_unique` ON `systems` (`api_key_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);