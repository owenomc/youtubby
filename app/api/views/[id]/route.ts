import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE } from "@/app/lib/db";
import { getVideos } from "@/app/lib/videos";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Only count views for videos that really exist in S3
  const videos = await getVideos();
  if (!videos.some((v) => v.id === id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const res = await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: "ADD #v :one",
      ExpressionAttributeNames: { "#v": "views" },
      ExpressionAttributeValues: { ":one": 1 },
      ReturnValues: "UPDATED_NEW",
    })
  );

  return Response.json({ views: res.Attributes?.views ?? 0 });
}