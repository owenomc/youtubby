// app/lib/db.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const db = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  })
);

export const TABLE = process.env.DDB_TABLE ?? "youtubby-videos";