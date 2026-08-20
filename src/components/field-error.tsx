export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="text-destructive text-sm">{messages[0]}</p>;
}
