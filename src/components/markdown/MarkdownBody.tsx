import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
};

export function MarkdownBody({ content }: Props) {
  return (
    <div
      className="
        text-base text-foreground leading-relaxed
        [&_h1]:text-xl [&_h1]:font-medium [&_h1]:tracking-tight [&_h1]:mt-6 [&_h1]:mb-3
        [&_h2]:text-[15px] [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:mt-5 [&_h2]:mb-2
        [&_h3]:text-[14px] [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-1.5
        [&_h4]:text-[14px] [&_h4]:font-medium [&_h4]:text-muted [&_h4]:uppercase [&_h4]:tracking-wider [&_h4]:mt-3 [&_h4]:mb-1
        [&_p]:my-2 [&_p]:text-foreground/90
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-1
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:space-y-1
        [&_li]:text-foreground/90
        [&_li>input]:mr-1.5
        [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline
        [&_strong]:text-foreground [&_strong]:font-medium
        [&_em]:text-foreground/90
        [&_code]:text-[14px] [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-foreground
        [&_pre]:bg-surface [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:my-3 [&_pre]:overflow-x-auto
        [&_pre>code]:bg-transparent [&_pre>code]:px-0 [&_pre>code]:py-0 [&_pre>code]:text-[14px]
        [&_blockquote]:border-l-2 [&_blockquote]:border-accent/40 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-muted
        [&_table]:w-full [&_table]:my-3 [&_table]:text-[14px] [&_table]:border-collapse
        [&_th]:text-left [&_th]:text-muted [&_th]:font-medium [&_th]:px-2 [&_th]:py-1.5 [&_th]:border-b [&_th]:border-border
        [&_td]:px-2 [&_td]:py-1.5 [&_td]:border-b [&_td]:border-border/50
        [&_hr]:my-5 [&_hr]:border-border
      "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
