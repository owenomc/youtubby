import { NextResponse } from "next/server";
import {
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, TABLE } from "@/app/lib/db";

function cleanUsername(value: string) {
  return decodeURIComponent(value)
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

function displayUsername(value: string) {
  return decodeURIComponent(value)
    .trim()
    .replace(/^@/, "");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username");

    if (!rawUsername) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 },
      );
    }

    const username = cleanUsername(rawUsername);

    if (!username) {
      return NextResponse.json(
        { error: "Invalid username." },
        { status: 400 },
      );
    }

    let startKey: Record<string, unknown> | undefined;

    do {
      const result = await db.send(
        new ScanCommand({
          TableName: TABLE,
          FilterExpression:
            "entityType = :entityType AND usernameLower = :usernameLower",
          ExpressionAttributeValues: {
            ":entityType": "profile",
            ":usernameLower": username,
          },
          ExclusiveStartKey: startKey,
        }),
      );

      const profile = result.Items?.[0];

      if (profile) {
        const profileUsername = String(
          profile.username ?? displayUsername(rawUsername),
        );

        return NextResponse.json({
          username: profileUsername,
          displayName: String(
            profile.displayName ?? profileUsername,
          ),
          picture: `/api/profile-picture?username=${encodeURIComponent(
            profileUsername,
          )}`,
        });
      }

      startKey = result.LastEvaluatedKey;
    } while (startKey);

    return NextResponse.json({
      username: displayUsername(rawUsername),
      displayName: displayUsername(rawUsername),
      picture: `/api/profile-picture?username=${encodeURIComponent(
        displayUsername(rawUsername),
      )}`,
    });
  } catch (error) {
    console.error("Unable to load profile:", error);

    return NextResponse.json(
      { error: "Unable to load profile." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rawUsername = String(body.username ?? "");
    const rawDisplayName = String(body.displayName ?? "");

    const username = cleanUsername(rawUsername);
    const displayName = rawDisplayName.trim();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 },
      );
    }

    if (!displayName) {
      return NextResponse.json(
        { error: "Display name is required." },
        { status: 400 },
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "Username must be between 3 and 30 characters." },
        { status: 400 },
      );
    }

    if (displayName.length > 50) {
      return NextResponse.json(
        { error: "Display name must be 50 characters or less." },
        { status: 400 },
      );
    }

    let existingProfile: Record<string, unknown> | null = null;

    let startKey: Record<string, unknown> | undefined;

    do {
      const result = await db.send(
        new ScanCommand({
          TableName: TABLE,
          FilterExpression:
            "entityType = :entityType AND usernameLower = :usernameLower",
          ExpressionAttributeValues: {
            ":entityType": "profile",
            ":usernameLower": username,
          },
          ExclusiveStartKey: startKey,
        }),
      );

      if (result.Items?.[0]) {
        existingProfile = result.Items[0] as Record<string, unknown>;
        break;
      }

      startKey = result.LastEvaluatedKey;
    } while (startKey);

    const id =
      typeof existingProfile?.id === "string"
        ? existingProfile.id
        : `profile#${username}`;

    await db.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          id,
          entityType: "profile",
          username,
          usernameLower: username,
          displayName,
          updatedAt: new Date().toISOString(),
          ...(existingProfile?.createdAt
            ? { createdAt: existingProfile.createdAt }
            : { createdAt: new Date().toISOString() }),
        },
      }),
    );

    return NextResponse.json({
      success: true,
      username,
      displayName,
      picture: `/api/profile-picture?username=${encodeURIComponent(
        username,
      )}`,
    });
  } catch (error) {
    console.error("Unable to save profile:", error);

    return NextResponse.json(
      { error: "Unable to save profile." },
      { status: 500 },
    );
  }
}