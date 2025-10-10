import { AmmoQueryParams } from "../../types";
import DisplayAmmo from "./DisplayAmmo";

export const metadata = { title: "Tarkov Ammo" };

type PageProps = {
  searchParams: Promise<{ queryParams?: AmmoQueryParams }>;
};

export default function tasks({ searchParams }: PageProps) {
  return <DisplayAmmo searchParams={searchParams} />;
}
