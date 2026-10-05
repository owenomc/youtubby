import { NextResponse } from "next/server";
import {
  DeleteCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, TABLE } from "@/app/lib/db";

function cleanUsername(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/^@/, "")
    : "";
}

function subscriptionId(
  subscriber: string,
  creator: string,
): string {
  return `subscription#${subscriber.toLowerCase()}#${creator.toLowerCase()}`;
}

async function scanSubscriptions(
  filterName: "creatorLower" | "subscriberLower",
  filterValue: string,
) {
  const subscriptions: Record<string, unknown>[] = [];

  let startKey: Record<string, unknown> | undefined;

  do {
    const result = await db.send(
      new ScanCommand({
        TableName: TABLE,

        FilterExpression:
          "entityType = :entityType AND #filterField = :filterValue",

        ExpressionAttributeNames: {
          "#filterField": filterName,
        },

        ExpressionAttributeValues: {
          ":entityType": "subscription",
          ":filterValue": filterValue.toLowerCase(),
        },

        ExclusiveStartKey: startKey,
      }),
    );

    subscriptions.push(
      ...((result.Items ?? []) as Record<string, unknown>[]),
    );

    startKey = result.LastEvaluatedKey;
  } while (startKey);

  return subscriptions;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const creator = cleanUsername(
      searchParams.get("creator"),
    );

    const subscriber = cleanUsername(
      searchParams.get("subscriber"),
    );

    if (creator) {
      const subscriptions = await scanSubscriptions(
        "creatorLower",
        creator,
      );

      const subscribed = subscriber
        ? subscriptions.some(
            (item) =>
              String(item.subscriberLower ?? "") ===
              subscriber.toLowerCase(),
          )
        : false;

      return NextResponse.json({
        subscriberCount: subscriptions.length,
        subscribed,
      });
    }

    if (subscriber) {
      const subscriptions = await scanSubscriptions(
        "subscriberLower",
        subscriber,
      );

      return NextResponse.json({
        subscriptions: subscriptions.map((item) => ({
          creator: String(item.creator ?? ""),
        })),
      });
    }

    return NextResponse.json(
      {
        error:
          "Creator or subscriber is required.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "Unable to load subscriptions:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load subscription information.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const subscriber = cleanUsername(body.subscriber);
    const creator = cleanUsername(body.creator);

    if (!subscriber || !creator) {
      return NextResponse.json(
        {
          error:
            "Subscriber and creator are required.",
        },
        { status: 400 },
      );
    }

    if (
      subscriber.toLowerCase() ===
      creator.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot subscribe to yourself.",
        },
        { status: 400 },
      );
    }

    const id = subscriptionId(
      subscriber,
      creator,
    );

    try {
      await db.send(
        new PutCommand({
          TableName: TABLE,

          Item: {
            id,
            entityType: "subscription",

            subscriber,
            subscriberLower:
              subscriber.toLowerCase(),

            creator,
            creatorLower:
              creator.toLowerCase(),

            createdAt:
              new Date().toISOString(),
          },

          ConditionExpression:
            "attribute_not_exists(id)",
        }),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name ===
          "ConditionalCheckFailedException"
      ) {
        // Already subscribed. That's fine.
      } else {
        throw error;
      }
    }

    const subscriptions =
      await scanSubscriptions(
        "creatorLower",
        creator,
      );

    return NextResponse.json({
      success: true,
      subscribed: true,
      subscriberCount:
        subscriptions.length,
    });
  } catch (error) {
    console.error(
      "Unable to subscribe:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to subscribe to this creator.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const subscriber = cleanUsername(body.subscriber);
    const creator = cleanUsername(body.creator);

    if (!subscriber || !creator) {
      return NextResponse.json(
        {
          error:
            "Subscriber and creator are required.",
        },
        { status: 400 },
      );
    }

    await db.send(
      new DeleteCommand({
        TableName: TABLE,

        Key: {
          id: subscriptionId(
            subscriber,
            creator,
          ),
        },
      }),
    );

    const subscriptions =
      await scanSubscriptions(
        "creatorLower",
        creator,
      );

    return NextResponse.json({
      success: true,
      subscribed: false,
      subscriberCount:
        subscriptions.length,
    });
  } catch (error) {
    console.error(
      "Unable to unsubscribe:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to unsubscribe from this creator.",
      },
      { status: 500 },
    );
  }
}