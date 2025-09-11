"use client";

import { useRouter } from "next/navigation";
import { ALL_TRADERS } from "../constants";

interface Props {
  trader: string;
}

function TraderSelect({ trader }: Props) {
  const router = useRouter();
  return (
    <select
      className="!mt-2 !ml-4 !w-80"
      onChange={(e) => router.push("/task_tree?trader=" + e.target.value)}
      defaultValue={trader}
    >
      {Object.entries(ALL_TRADERS)
        //.filter((trader) => trader[0] !== "any")
        .map(([key, value]) => (
          <option key={key} value={key}>
            Trader: {value}
          </option>
        ))}
    </select>
  );
}

export default TraderSelect;
