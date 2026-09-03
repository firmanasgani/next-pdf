import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isTool, toolConfig, TOOL_SLUGS } from '@/lib/tools';
import ToolWorkspace from './ToolWorkspace';

export function generateStaticParams() {
  return TOOL_SLUGS.map((tool) => ({ tool }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  if (!isTool(tool)) return { title: 'Module not found — NextPDF' };
  const cfg = toolConfig[tool];
  return {
    title: `${cfg.label} — NextPDF`,
    description: cfg.description,
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  if (!isTool(tool)) notFound();

  // key={tool} forces a fresh mount (and clean state) on every module switch.
  return <ToolWorkspace key={tool} tool={tool} />;
}
