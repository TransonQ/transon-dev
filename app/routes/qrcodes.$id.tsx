import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import { getQRCodeImage } from "~/models/QRCode.server";
import db from "../db.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  // 在该函数中，检查 URL 中是否有 ID。如果不存在，请使用 tiny-invariant 抛出错误。
  invariant(params.id, "Could not find QR code destination");

  /**
   * 如果 URL 中有 ID，请使用 Prisma 加载具有该 ID 的 QR 码：
   * - 如果表中没有匹配的二维码 ID，则使用 tiny-invariant 抛出错误。
   * - 如果有匹配的 ID，则使用 Remix json 函数返回 QR 码。
   */
  const id = Number(params.id);
  const qrCode = await db.qRCode.findFirst({ where: { id } });

  invariant(qrCode, "Could not find QR code destination");

  return json({
    title: qrCode.title,
    image: await getQRCodeImage(id),
  });
};

export default function QRCode() {
  const { image, title } = useLoaderData<typeof loader>();

  return (
    <>
      <h1>{title}</h1>
      <img src={image} alt={`QR Code for product`} />
    </>
  );
}
