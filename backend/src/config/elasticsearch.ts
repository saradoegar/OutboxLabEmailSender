import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const esNode = process.env.ELASTICSEARCH_URL || process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';

export const elasticClient = new Client({
  node: esNode,
});

export const EMAIL_INDEX = 'emails';

/**
 * Initializes the Elasticsearch 'emails' index with appropriate mappings if it doesn't already exist.
 */
export async function initElasticsearchIndex(): Promise<void> {
  try {
    const exists = await elasticClient.indices.exists({ index: EMAIL_INDEX });

    if (!exists) {
      console.log(`[Elasticsearch] Index '${EMAIL_INDEX}' does not exist. Creating with field mappings...`);
      await elasticClient.indices.create({
        index: EMAIL_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            recipientEmail: { type: 'keyword' },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`[Elasticsearch] Index '${EMAIL_INDEX}' created successfully.`);
    } else {
      console.log(`[Elasticsearch] Index '${EMAIL_INDEX}' already exists and is ready.`);
    }
  } catch (error) {
    console.warn(
      `[Elasticsearch] Notice: Could not connect to Elasticsearch at ${esNode}. (Proceeding with graceful database fallback):`,
      error instanceof Error ? error.message : error
    );
  }
}
