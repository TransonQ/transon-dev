import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Bleed,
  BlockStack,
  Button,
  Card,
  ChoiceList,
  Divider,
  EmptyState,
  InlineError,
  InlineStack,
  Layout,
  Page,
  PageActions,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import { ImageMajor } from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";

import { useLoadingByAction } from "~/hooks";
import { parseFormData } from "~/utils";
import db from "../db.server";
import { getQRCode, validateQRCode } from "../models/QRCode.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  /**
   * 验证用户身份
   * 如果用户未经过身份验证， authenticate.admin 将处理必要的重定向。
   * 如果用户通过身份验证，则该方法返回一个管理对象。
   * 您可以将 authenticate.admin 方法用于以下目的：
   * - 从会话中获取信息，例如 shop 。
   * - 访问管理 GraphQL API (https://shopify.dev/docs/api/admin-graphql)
   * - 访问管理 REST API (https://shopify.dev/docs/api/admin-rest)
   * - 在要求和请求计费的方法中。
   */
  const { admin } = await authenticate.admin(request);

  if (params.id === "new") {
    return json({
      destination: "product",
      title: "",
    });
  }
  /**
   * 返回 JSON 响应
   * 使用 json util，返回可用于显示QR码数据的 Response 。
   * 果 id 参数为 new ，则返回带有空标题的 JSON 以及目标的产品。
   * 如果 id 参数不是 new ，则从 getQRCode 返回 JSON 以填充 QR 码状态。
   */
  return json(await getQRCode(Number(params.id), admin.graphql));
}

/**
 * action 应该使用会话中的存储。这可确保应用程序用户只能创建、更新或删除自己商店的二维码。
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const data: any = {
    ...Object.fromEntries(await request.formData()),
    shop,
  };

  /**
   * 如果该操作删除了 QR 码，则将应用程序用户重定向到索引页面。
   * 如果操作创建 QR 码，则重定向到 app/qrcodes/$id ，其中 $id 是新创建的 QR 码的 ID。
   */
  if (data.action === "delete") {
    await db.qRCode.delete({ where: { id: Number(params.id) } });
    return redirect("/app");
  }

  // 该操作应使用 validateQRCode 函数返回不完整数据的错误。
  const errors: any = validateQRCode(data);

  if (errors) {
    return json({ errors }, { status: 422 });
  }

  const qrCode =
    params.id === "new"
      ? await db.qRCode.create({ data })
      : await db.qRCode.update({ where: { id: Number(params.id) }, data });

  return redirect(`/app/qrcodes/${qrCode.id}`);
}

export default function QRCodeForm() {
  /**
   * errors ：如果应用用户未填写所有 QR 码表单字段，则该操作将返回要显示的错误。
   * 这是 validateQRCode 的返回值，可通过 Remix useActionData 挂钩访问。
   */
  const errors = useActionData<any>()?.errors || {};

  const qrCode = useLoaderData<any>();
  /**
   * formState ：当用户更改标题、选择产品或更改目的地时，此状态会更新。
   * 该状态从 useLoaderData 复制到 React 状态。
   */
  const [formState, setFormState] = useState<any>(qrCode);
  /**
   * cleanFormState ：表单的初始状态。仅当用户提交表单时才会更改。
   * 该状态从 useLoaderData 复制到 React 状态。
   */
  const [cleanFormState, setCleanFormState] = useState(qrCode);
  /**
   * isDirty ：确定表单是否已更改。
   * 这用于在应用程序用户更改表单内容时启用保存按钮，或在表单内容未更改时禁用它们。
   */
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  const nav = useNavigation();
  useEffect(() => {
    console.log("nav: ", nav);
    console.log("nav.formData: ", parseFormData(nav.formData));
  }, [nav]);
  /**
   * isDirty ：确定表单是否已更改。
   * 这用于在应用程序用户更改表单内容时启用保存按钮，或在表单内容未更改时禁用它们。
   * isSaving 和 isDeleting ：使用 useNavigation 跟踪网络状态。
   * 此状态用于禁用按钮并显示加载状态。
   */
  const isSaving = useLoadingByAction();
  const isDeleting = useLoadingByAction("delete");

  const navigate = useNavigate();

  /**
   * 使用 App Bridge ResourcePicker(https://shopify.dev/docs/api/app-bridge-library/reference/resource-picker)
   * 添加允许用户选择产品的模式。将选择保存到表单状态。
   */
  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select", // customized action verb, either 'select' or 'add',
    });

    if (products) {
      const { images, id, variants, title, handle } = products[0];

      setFormState({
        ...formState,
        productId: id,
        productVariantId: variants[0].id,
        productTitle: title,
        productHandle: handle,
        productAlt: images[0]?.altText,
        productImage: images[0]?.originalSrc,
      });
    }
  }

  /**
   * 使用 useSubmit Remix 挂钩保存表单数据。
   * https://remix.run/docs/en/main/hooks/use-submit
   */
  const submit = useSubmit();
  function handleSave() {
    const data = {
      title: formState.title,
      productId: formState.productId || "",
      productVariantId: formState.productVariantId || "",
      productHandle: formState.productHandle || "",
      destination: formState.destination,
    };

    setCleanFormState({ ...formState });
    submit(data, { method: "post" });
  }

  /**
   * 布局
   */
  return (
    <Page>
      <ui-title-bar title={qrCode.id ? "Edit QR code" : "Create new QR code"}>
        <button variant="breadcrumb" onClick={() => navigate("/app")}>
          QR codes
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="500">
                <Text as={"h2"} variant="headingLg">
                  Title
                </Text>
                <TextField
                  id="title"
                  helpText="Only store staff can see this title"
                  label="title"
                  labelHidden
                  autoComplete="off"
                  value={formState.title}
                  onChange={(title) => setFormState({ ...formState, title })}
                  error={errors.title}
                />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between">
                  <Text as={"h2"} variant="headingLg">
                    Product
                  </Text>
                  {formState.productId ? (
                    <Button variant="plain" onClick={selectProduct}>
                      Change product
                    </Button>
                  ) : null}
                </InlineStack>
                {formState.productId ? (
                  <InlineStack blockAlign="center" gap="500">
                    <Thumbnail
                      source={formState.productImage || ImageMajor}
                      alt={formState.productAlt}
                    />
                    <Text as="span" variant="headingMd" fontWeight="semibold">
                      {formState.productTitle}
                    </Text>
                  </InlineStack>
                ) : (
                  <BlockStack gap="200">
                    <Button onClick={selectProduct} id="select-product">
                      Select product
                    </Button>
                    {errors.productId ? (
                      <InlineError
                        message={errors.productId}
                        fieldID="myFieldID"
                      />
                    ) : null}
                  </BlockStack>
                )}
                <Bleed marginInlineStart="200" marginInlineEnd="200">
                  <Divider />
                </Bleed>
                <InlineStack gap="500" align="space-between" blockAlign="start">
                  <ChoiceList
                    title="Scan destination"
                    choices={[
                      { label: "Link to product page", value: "product" },
                      {
                        label: "Link to checkout page with product in the cart",
                        value: "cart",
                      },
                    ]}
                    selected={[formState.destination]}
                    onChange={(destination) =>
                      setFormState({
                        ...formState,
                        destination: destination[0],
                      })
                    }
                    error={errors.destination}
                  />
                  {qrCode.destinationUrl ? (
                    <Button
                      variant="plain"
                      url={qrCode.destinationUrl}
                      target="_blank"
                    >
                      Go to destination URL
                    </Button>
                  ) : null}
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <Text as={"h2"} variant="headingLg">
              QR code
            </Text>
            {qrCode ? (
              <EmptyState image={qrCode.image} imageContained={true} />
            ) : (
              <EmptyState image="">
                Your QR code will appear here after you save
              </EmptyState>
            )}
            <BlockStack gap="300">
              <Button
                disabled={!qrCode?.image}
                url={qrCode?.image}
                download
                variant="primary"
              >
                Download
              </Button>
              <Button
                disabled={!qrCode.id}
                url={`/qrcodes/${qrCode.id}`}
                target="_blank"
              >
                Go to public URL
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <PageActions
            secondaryActions={[
              {
                content: "Delete",
                loading: isDeleting,
                disabled: !qrCode.id || !qrCode || isSaving || isDeleting,
                destructive: true,
                outline: true,
                onAction: () =>
                  submit({ action: "delete" }, { method: "post" }),
              },
            ]}
            primaryAction={{
              content: "Save",
              loading: isSaving,
              disabled: !isDirty || isSaving || isDeleting,
              onAction: handleSave,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
