import qrcode from "qrcode";
import invariant from "tiny-invariant";
import db from "../db.server";

/**
 * 创建一个函数来获取 QR 码表单的单个 QR 码，并创建第二个函数来获取应用程序索引页的多个 QR 码。
 * 您将在本教程后面创建一个 QR 代码表单。
 * 可以使用 Prisma FindFirst 和 FindMany 查询检索存储在数据库中的 QR 码。
 */
export async function getQRCode(id: number, graphql: any) {
  const qrCode = await db.qRCode.findFirst({ where: { id } });

  if (!qrCode) {
    return null;
  }

  return supplementQRCode(qrCode, graphql);
}

export async function getQRCodes(shop: any, graphql: any) {
  const qrCodes = await db.qRCode.findMany({
    where: { shop },
    orderBy: { id: "desc" },
  });

  if (qrCodes.length === 0) return [];

  return Promise.all(
    qrCodes.map((qrCode) => supplementQRCode(qrCode, graphql))
  );
}

/**
 * 获取二维码图片
 * QR 码将用户带到 /qrcodes/$id/scan ，
 * 其中 $id 是 QR 码的 ID。创建一个函数来构造此 URL，
 * 然后使用 qrcode 包返回基本 64 编码的 QR 码图像 src 。
 */
export function getQRCodeImage(id: number) {
  const url = new URL(`/qrcodes/${id}/scan`, process.env.SHOPIFY_APP_URL);
  return qrcode.toDataURL(url.href);
}

/**
 * 获取目标网址
 * 扫描二维码会将用户带到两个地方之一：
 * 1. 产品详情页面
 * 2. 使用购物车中的产品结账
 * 创建一个函数，根据商家选择的目的地有条件地构造此 URL。
 */
export function getDestinationUrl(qrCode: any) {
  if (qrCode.destination === "product") {
    return `https://${qrCode.shop}/products/${qrCode.productHandle}`;
  }

  const match = /gid:\/\/shopify\/ProductVariant\/([0-9]+)/.exec(
    qrCode.productVariantId
  );
  invariant(match, "Unrecognized product variant ID");

  return `https://${qrCode.shop}/cart/${match[1]}:1`;
}

/**
 * 检索附加产品和变体数据
 * Prisma 的二维码需要补充产品数据。它还需要 QR 码图像和目标 URL。
 * 创建一个函数，用于查询 Shopify Admin GraphQL API 中的产品标题以及第一个特色产品图片的 URL 和替代文本。
 * 它还应该返回一个包含 QR 码数据和产品数据的对象，
 * 并使用您创建的 getDestinationUrl 和 getQRCodeImage 函数来获取目标 URL 的 QR 码图像。
 */
async function supplementQRCode(qrCode: any, graphql: any) {
  const qrCodeImagePromise = getQRCodeImage(qrCode.id);

  const response = await graphql(
    `
      query supplementQRCode($id: ID!) {
        product(id: $id) {
          title
          images(first: 1) {
            nodes {
              altText
              url
            }
          }
        }
      }
    `,
    {
      variables: {
        id: qrCode.productId,
      },
    }
  );

  const {
    data: { product },
  } = await response.json();

  return {
    ...qrCode,
    productDeleted: !product?.title,
    productTitle: product?.title,
    productImage: product?.images?.nodes[0]?.url,
    productAlt: product?.images?.nodes[0]?.altText,
    destinationUrl: getDestinationUrl(qrCode),
    image: await qrCodeImagePromise,
  };
}

/**
 * 验证二维码
 * 要创建有效的二维码，应用程序用户需要提供标题，并选择产品和目的地。
 * 添加一个函数，以确保当用户提交表单以创建 QR 码时，所有必填字段都存在值。
 * QR 码表单的操作将从该函数返回错误。
 */
export function validateQRCode(data: any): any {
  const errors: any = {};

  if (!data.title) {
    errors.title = "Title is required";
  }

  if (!data.productId) {
    errors.productId = "Product is required";
  }

  if (!data.destination) {
    errors.destination = "Destination is required";
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}
