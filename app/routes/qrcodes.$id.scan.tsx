import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import db from "../db.server";

import { getDestinationUrl } from "../models/QRCode.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  // 在此函数中，检查 URL 中是否有 ID。如果 ID 不存在，则使用 tiny-invariant 抛出错误。
  invariant(params.id, "Could not find QR code destination");

  // 从 Prisma 数据库加载 QR 码。
  const id = Number(params.id);
  const qrCode = await db.qRCode.findFirst({ where: { id } });
  // 如果指定 ID 的 QR 码不存在，则使用 tiny-invariant 抛出错误。
  invariant(qrCode, "Could not find QR code destination");

  // 如果 loader 返回QR码，则增加数据库中的扫描计数。
  await db.qRCode.update({
    where: { id },
    data: { scans: { increment: 1 } },
  });

  // 使用 getDestinationUrl 和 Remix redirect 实用程序重定向到 QR 代码的目标 URL
  return redirect(getDestinationUrl(qrCode));
};
