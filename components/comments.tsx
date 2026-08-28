"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addCommentAction } from "@/app/actions/work";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/work-ui";
import { formatDateTime } from "@/lib/dates";

export function CommentThread({
  targetType,
  targetId,
  comments,
}: {
  targetType: "TASK" | "PROJECT" | "MEETING";
  targetId: string;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    userId?: { name?: string; avatar?: string };
  }>;
}) {
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <UserAvatar name={comment.userId?.name} src={comment.userId?.avatar} size="sm" />
            <div className="rounded-xl border bg-card px-3 py-2">
              <p className="text-xs font-medium">
                {comment.userId?.name}{" "}
                <span className="font-normal text-muted-foreground">
                  {formatDateTime(comment.createdAt)}
                </span>
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await addCommentAction({ targetType, targetId, body });
            if (result && "error" in result) {
              toast.error("Could not comment");
              return;
            }
            setBody("");
            toast.success("Comment added");
          });
        }}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a comment. Use @Name to mention someone."
          rows={3}
        />
        <Button type="submit" disabled={pending || !body.trim()}>
          Comment
        </Button>
      </form>
    </div>
  );
}
