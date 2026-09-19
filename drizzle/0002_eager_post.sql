ALTER TABLE `reports` ADD `attachments` text NULL;
UPDATE `reports` SET `attachments` = '[]' WHERE `attachments` IS NULL;
ALTER TABLE `reports` MODIFY `attachments` text NOT NULL;
