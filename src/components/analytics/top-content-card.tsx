import Image from "next/image";
import Link from "next/link";
import { Zap } from "lucide-react";
import { formatCompact, formatCount } from "@/lib/analytics/format";
import type { ContentSummary } from "@/lib/analytics/content";

export function TopContentCard({ posts }: { posts: ContentSummary[] }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Top Content</h3>
      {posts.length === 0 ? (
        <p className="text-sm text-neutral-500">No content published in this period yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/analytics/content/${post.id}`}
                className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-neutral-800/60"
              >
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-800">
                  {post.thumbnailUrl && (
                    <Image
                      src={post.thumbnailUrl}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-200">{post.caption ?? "Untitled"}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                    <span>{formatCompact(post.views)} views</span>
                    <span>{post.engagementRate.toFixed(1)}% engagement</span>
                    <span>+{formatCount(post.followersGained)} followers</span>
                    {post.hasAutomation && (
                      <span className="inline-flex items-center gap-1 text-violet-400">
                        <Zap className="h-3 w-3" aria-hidden />
                        AutoDM
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
