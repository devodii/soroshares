"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityFeed } from "@/hooks/use-activity-feed";

function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function ActivityFeed() {
  const { data: events, isLoading } = useActivityFeed();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (!events || events.length === 0) && (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
        <ul className="space-y-2">
          {events?.map((event) => (
            <li key={event.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{event.type}</Badge>
                {event.address && (
                  <span className="text-muted-foreground">{truncate(event.address)}</span>
                )}
                <span className="text-muted-foreground">{event.detail}</span>
              </div>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground underline underline-offset-2"
              >
                ledger {event.ledger}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
