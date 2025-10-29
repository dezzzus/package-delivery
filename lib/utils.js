import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { Client } from "@notionhq/client";
const notionDatabaseId = process.env.NOTION_DATABASE_ID;
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const deliveryStatus = {
  평양도착: 4,
  신의주출발: 3,
  신의주도착: 2,
  세관검사: 1,
  창고접수: 0,
};

// Color categories for order-based coloring
const colorCategories = [
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    statusText: "text-blue-600",
  },
  {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    statusText: "text-green-600",
  },
  {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    statusText: "text-yellow-600",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    statusText: "text-purple-600",
  },
  {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-800",
    statusText: "text-pink-600",
  },
  {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-800",
    statusText: "text-indigo-600",
  },
];

// Get colors based on order index
export const getOrderColors = (orderIndex) => {
  return colorCategories[orderIndex % colorCategories.length];
};

// Get colors based on order index
export const getStatusColors = (color) => {
  return {
    bg: `bg-${color}-50`,
    border: `border-${color}-200`,
    text: `text-${color}-800`,
    statusText: `text-${color}-600`,
  };
};

export const constantFields = [
  { name: "단위명", id: "company" },
  { name: "발송자전화번호", id: "senderPhone" },
  { name: "발송자", id: "sender" },
  { name: "접수자", id: "receiver" },
  { name: "접수자전화번호", id: "receiverPhone" },
  { name: "짐상태", id: "status" },
];

// Get database schema to identify columns
export const getDatabaseSchema = async () => {
  const response = await notion.databases.retrieve({
    database_id: notionDatabaseId,
  });

  const properties = response.properties;
  const schema = {
    constantFields: [],
    displayFields: [],
    allFields: [],
  };

  // Find the phone number field and identify display columns
  Object.entries(properties).forEach(([key, property]) => {
    const columnInfo = {
      id: key,
      name: property.name,
      type: property.type,
    };

    schema.allFields.push(columnInfo);

    // Identify title field (primary field)
    if (property.type === "title") {
      schema.titleField = columnInfo;
    }

    // Identify phone number field
    if (constantFields.find((field) => field.name === property.name)) {
      schema.constantFields.push(columnInfo);
    }

    // Identify display columns (columns that end with '*')
    if (property.name.endsWith("*")) {
      schema.displayFields.push(columnInfo);
    }
  });

  return schema;
};

// Extract property value based on type
export const extractPropertyValue = (property) => {
  if (!property) return "";

  switch (property.type) {
    case "title":
      return property.title?.[0]?.plain_text || "";
    case "rich_text":
      return property.rich_text?.[0]?.plain_text || "";
    case "phone_number":
      return property.phone_number || "";
    case "email":
      return property.email || "";
    case "url":
      return property.url || "";
    case "number":
      return property.number?.toString() || "";
    case "select":
      return property.select?.name || "";
    case "multi_select":
      return property.multi_select?.map((item) => item.name).join(", ") || "";
    case "date":
      return property.date?.start
        ? new Date(property.date.start).toISOString().split("T")[0]
        : "";
    case "checkbox":
      return property.checkbox ? "Yes" : "No";
    case "status":
      return property.status?.name || "";
    case "created_time":
      return property.created_time
        ? new Date(property.created_time).toISOString().split("T")[0]
        : "";
    case "last_edited_time":
      return property.last_edited_time
        ? new Date(property.last_edited_time).toISOString().split("T")[0]
        : "";
    default:
      return "";
  }
};

// Extract property value based on type
export const extractPropertyExtraValue = (property, field) => {
  if (!property) return null;

  if (property.type === "status") {
    return property.status[field];
  }

  return null;
};

export const getAccumedPackages = async (phoneNumber) => {
  const schema = await getDatabaseSchema();

  const phoneField = schema.constantFields.find(
    (field) => field.name === "발송자전화번호"
  );

  if (!phoneField) {
    throw new Error("No phone number field found in the database");
  }

  const response = await notion.databases.query({
    database_id: notionDatabaseId,
    filter: {
      and: [
        {
          property: phoneField.id,
          phone_number: {
            equals: phoneNumber,
          },
        },
      ],
    },
  });

  const result = response.results.reduce((accum, page) => {
    const titleProperty = page.properties[schema.titleField.id];
    const title = extractPropertyValue(titleProperty);

    const fullpackageList = Object.entries(
      extractMatchedExportNumber(title)
    ).reduce((accum, [key, value]) => {
      return [
        ...accum,
        ...value.map((v) => {
          // Extract data for display columns (excluding title field to avoid duplication)
          const extraValues = {};
          schema.displayFields.forEach((column) => {
            const property = page.properties[column.id];
            extraValues[column.name.replace("*", "")] =
              extractPropertyValue(property);
          });

          return {
            company: extractPropertyValue(page.properties["단위명"]),
            sender: extractPropertyValue(page.properties["발송자"]),
            senderPhone: extractPropertyValue(
              page.properties["발송자전화번호"]
            ),
            receiver: extractPropertyValue(page.properties["접수자"]),
            receiverPhone: extractPropertyValue(
              page.properties["접수자전화번호"]
            ),
            status: extractPropertyValue(page.properties["짐상태"]),
            label: parseInt(key, 10),
            extraValues,
            ...v,
          };
        }),
      ];
    }, []);

    return [...accum, ...fullpackageList];
  }, []);

  return result;
};

function isNumberOnly(str) {
  // returns true only if the string is purely numeric
  return /^[0-9]+$/.test(str.trim());
}

export const getPackages = async (phoneNumber) => {
  const schema = await getDatabaseSchema();

  let filter = null;
  const isPhone = isNumberOnly(phoneNumber);

  if (isPhone) {
    const phoneField = schema.constantFields.find(
      (field) => field.name === "발송자전화번호"
    );

    if (!phoneField) {
      throw new Error("No phone number field found in the database");
    }

    filter = {
      property: phoneField.id,
      phone_number: {
        equals: phoneNumber,
      },
    };
  } else {
    const companyField = schema.constantFields.find(
      (field) => field.name === "단위명"
    );

    if (!companyField) {
      throw new Error("No company field found in the database");
    }

    filter = {
      property: companyField.id,
      select: {
        equals: decodeURIComponent(phoneNumber),
      },
    };
  }

  const response = await notion.databases.query({
    database_id: notionDatabaseId,
    filter,
    sorts: [
      {
        timestamp: "last_edited_time",
        direction: "descending",
      },
    ],
  });

  return response.results.map((page, index) => {
    const packageData = {
      orderIndex: index,
      lastEdited: page.last_edited_time,
      isVisible: true,
    };
    // Extract the main title field (primary field)
    if (schema.titleField) {
      const titleProperty = page.properties[schema.titleField.id];
      packageData.title_name = schema.titleField.name;
      packageData.title = extractPropertyValue(titleProperty);
    }

    const statusProperty = schema.constantFields.find(
      (field) => field.name === "짐상태"
    );
    if (statusProperty) {
      const statusPropertyValue = extractPropertyValue(
        page.properties[statusProperty.id]
      );
      if (statusPropertyValue === "창고접수") {
        packageData.isVisible = false;
      }
      packageData[statusProperty.name] = statusPropertyValue;
    }

    // Extract data for display columns (excluding title field to avoid duplication)
    schema.displayFields.forEach((column) => {
      const property = page.properties[column.id];
      packageData[column.name.replace("*", "")] =
        extractPropertyValue(property);
    });

    return packageData;
  });
};

export const getGropuedPackagesByDelieverNumber = (packages) => {
  const groupedResult = Object.entries(
    packages.reduce((acc, item) => {
      if (!acc[item.deliverNumber]) acc[item.deliverNumber] = [];
      acc[item.deliverNumber].push(item);
      return acc;
    }, {})
  ) // Sort by status
    .sort(([a], [b]) => b - a)
    // Sort inside each group
    .map(([, items]) => items);
  return groupedResult;
};

export const getGropuedPackagesByStatus = (packages) => {
  // 2. Sort by smallest number in each data array

  const groupedResult = Object.entries(
    packages.reduce((acc, item) => {
      if (!acc[item.status]) acc[item.status] = [];
      acc[item.status].push(item);
      return acc;
    }, {})
  )
    // Sort by status
    .sort(([a], [b]) => deliveryStatus[a] - deliveryStatus[b])
    // Sort inside each group
    .map(([, items]) =>
      items.sort((a, b) => {
        if (a.label !== b.label) return a.label - b.label;
        return a.index - b.index;
      })
    );

  return groupedResult;
};

const extractMatchedExportNumber = (input) => {
  // 1. Split into tokens by '*' (ignore empty ones)
  const tokens = input.split("*").filter(Boolean);

  const result = {};

  for (const token of tokens) {
    // Remove leading/trailing spaces
    const str = token.trim();

    // Match the prefix (e.g. 9A) and the numbers part
    // Regex: /^(\d+A)-(.+)$/
    const match = str.match(/^(\d+차)-(.+)$/);
    if (!match) continue;

    const prefix = match[1]; // e.g. '9A'
    const rest = match[2]; // e.g. '54~57, 58'

    // Split by commas, ignoring spaces
    const parts = rest.split(/\s*,\s*/);

    const numbersArr = [];

    for (const part of parts) {
      // Match a number or range, with optional parentheses
      const m = part.match(/^(\d+(?:~\d+)?)(?:\(([^)]*)\))?$/);
      if (!m) continue;

      const value = m[1]; // '32' or '54~57'
      const item = m[2] || null; // '(Watch)' etc

      // Expand ranges
      if (value.includes("~")) {
        const [start, end] = value.split("~").map(Number);
        for (let i = start; i <= end; i++) {
          numbersArr.push({ index: i, item });
        }
      } else {
        numbersArr.push({ index: Number(value), item });
      }
    }

    if (!result[prefix]) result[prefix] = [];
    result[prefix].push(...numbersArr); // merge arrays
  }

  return result;
};

export const generateList = async (exportNumber) => {
  const schema = await getDatabaseSchema();

  const response = await notion.databases.query({
    database_id: notionDatabaseId,
    filter: {
      property: schema.titleField.id,
      title: {
        contains: `*${exportNumber}차`,
      },
    },
  });

  const result = response.results.reduce((accum, page) => {
    const titleProperty = page.properties[schema.titleField.id];
    const title = extractPropertyValue(titleProperty);
    const extractedList = extractMatchedExportNumber(title);
    const packageList = extractedList[`${exportNumber}차`];
    if (!packageList) {
      return accum;
    }

    const constantValues = constantFields.reduce(
      (accum, cur) => ({
        [cur.id]: extractPropertyValue(page.properties[cur.name]),
        ...accum,
      }),
      {}
    );

    const fullpackageList = packageList.map((p) => ({
      ...constantValues,
      ...p,
      label: exportNumber,
    }));

    return [...accum, ...fullpackageList];
  }, []);

  // 2. Sort by smallest number in each data array
  result.sort((a, b) => {
    return a.index - b.index;
  });

  return result;
};

export const missedItems = (allNumbers) => {
  // 2️⃣ Find missing numbers from 1 to max
  const max = Math.max(...allNumbers);
  const missing = [];
  for (let i = 1; i <= max; i++) {
    if (!allNumbers.has(i)) missing.push(i);
  }

  // 3️⃣ Convert consecutive numbers into ranges
  const result = [];
  let start = null;
  let end = null;

  for (const n of missing) {
    if (start === null) {
      start = end = n;
    } else if (n === end + 1) {
      end = n;
    } else {
      result.push(start === end ? `${start}` : `${start}~${end}`);
      start = end = n;
    }
  }

  // Push the last range
  if (start !== null) {
    result.push(start === end ? `${start}` : `${start}~${end}`);
  }

  return result;
};

export const decompressIndices = (text) => {
  const numbersArr = [];
  const parts = text.split(/\s*,\s*/);

  for (const part of parts) {
    // Match a number or range, with optional parentheses
    const m = part.match(/^(\d+(?:~\d+)?)(?:\(([^)]*)\))?$/);
    if (!m) continue;

    const value = m[1]; // '32' or '54~57'

    // Expand ranges
    if (value.includes("~")) {
      const [start, end] = value.split("~").map(Number);
      for (let i = start; i <= end; i++) {
        numbersArr.push(i);
      }
    } else {
      numbersArr.push(Number(value));
    }
  }
  return numbersArr;
};

export const compressIndices = (items) => {
  const groupedByLabel = items.reduce((acc, item) => {
    if (!acc[item.label]) acc[item.label] = [];
    acc[item.label].push(item.index);
    return acc;
  }, {});

  const result = [];

  for (const [label, indices] of Object.entries(groupedByLabel)) {
    indices.sort((a, b) => a - b);

    const parts = [];
    let start = indices[0];
    let prev = indices[0];

    for (let i = 1; i <= indices.length; i++) {
      const curr = indices[i];
      if (curr !== prev + 1) {
        // Close the current range
        if (start === prev) parts.push(`${start}`);
        else parts.push(`${start}~${prev}`);
        start = curr;
      }
      prev = curr;
    }

    result.push(`${label}차-${parts.join(", ")}`);
  }

  return result.join(", ");
};

export const searchAllPages = async (exportNumber) => {
  let results = [];
  let hasMore = true;
  let nextCursor = undefined;

  while (hasMore) {
    const response = await notion.search({
      query: `*${exportNumber}차`,
      filter: { property: "object", value: "page" },
      page_size: 100,
      start_cursor: nextCursor,
    });

    // Keep only pages in the target database
    const pagesInDatabase = response.results.filter(
      (p) => p.parent?.database_id === notionDatabaseId
    );

    results.push(...pagesInDatabase);

    hasMore = response.has_more;
    nextCursor = response.next_cursor;
  }

  return results;
};

export const getAllPages = async (exportNumber) => {
  const schema = await getDatabaseSchema();

  let results = [];
  let hasMore = true;
  let cursor = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
      start_cursor: cursor,
      filter: {
        property: schema.titleField.id,
        title: {
          contains: `*${exportNumber}차`,
        },
      },
      page_size: 100,
      archived: true,
    });

    results = results.concat(response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor;
  }

  return results;
};

export const archivePages = async (pages, archived) => {
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`Updating ${i + 1}/${pages.length}: ${page.id}`);

    await notion.pages.update({
      page_id: page.id,
      archived,
    });

    // 💡 Notion rate limit(3 req/sec)
    await new Promise((r) => setTimeout(r, 400));
  }
};
