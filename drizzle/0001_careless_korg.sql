CREATE TABLE `issueClusters` (
	`id` varchar(32) NOT NULL,
	`category` varchar(120) NOT NULL,
	`location` varchar(255) NOT NULL,
	`reportCount` int NOT NULL,
	`priority` enum('High','Medium','Low') NOT NULL,
	`summary` text NOT NULL,
	`recommendedAction` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issueClusters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` varchar(32) NOT NULL,
	`description` text NOT NULL,
	`location` varchar(255) NOT NULL,
	`imageUrl` text,
	`audioUrl` text,
	`source` enum('Photo','Text','Voice') NOT NULL DEFAULT 'Text',
	`category` varchar(120) NOT NULL,
	`shortCategory` varchar(60) NOT NULL,
	`priority` enum('High','Medium','Low') NOT NULL,
	`confidence` int NOT NULL,
	`evidence` text NOT NULL,
	`summary` text NOT NULL,
	`department` varchar(160) NOT NULL,
	`suggestedAction` text NOT NULL,
	`status` enum('New','Assigned','In progress','Resolved') NOT NULL DEFAULT 'New',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
