import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import {
  generateList,
  missedItems,
  compressIndices,
} from "../../../../lib/utils";

export async function GET(req, { params }) {
  const { searchParams } = new URL(req.url);
  const exportType = parseInt(searchParams.get("type")) || 1; // ?name=eric

  const num = Number(params.num); // URL param

  const data = await generateList(num);

  const workbook = new ExcelJS.Workbook();

  // Path to your template file (must be inside the project or readable path)
  const templatePath = path.join(process.cwd(), `template-${exportType}.xlsx`);

  // Load the template
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.getWorksheet("Sheet1");

  const allNumbers = new Set();
  for (const obj of data) {
    allNumbers.add(obj.index);
  }
  const totalNumber = Math.max(...allNumbers);

  let title = `련못제${num}차 소환짐명세서\n(련못 제${num}차-1~${totalNumber})\n차번호:        총짝수:${totalNumber}짝`;

  const missedPackageNumbers = missedItems(allNumbers);
  if (missedPackageNumbers.length) {
    title += `(${missedPackageNumbers.join(", ")} 없음)`;
  }

  sheet.getCell("A1").value = title;

  const rowOffset = 3;
  let newCompanyRowIndex = rowOffset;
  let newReceiverRowIndex = rowOffset;

  if (exportType === 1) {
    let rowIndex = rowOffset;
    const grouped = [];
    let currentGroup = [];

    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const prev = data[i - 1];

      if (
        i === 0 ||
        current.company !== prev.company ||
        current.sender !== prev.sender
      ) {
        if (currentGroup.length) grouped.push(currentGroup);
        currentGroup = [current];
      } else {
        currentGroup.push(current);
      }
    }

    // push last group
    if (currentGroup.length) grouped.push(currentGroup);

    for (const itemData of grouped) {
      const readableLabel = compressIndices(itemData);
      sheet.getCell(`A${rowIndex}`).value = itemData[0].sender;
      sheet.getCell(`B${rowIndex}`).value = itemData[0].company;
      sheet.getCell(`C${rowIndex}`).value = itemData.length;
      sheet.getCell(`D${rowIndex}`).value = readableLabel;

      sheet.getCell(`E${rowIndex}`).value = [...new Set(itemData.map(item => item.item))].filter(item => item).join(", ");
      sheet.getCell(`F${rowIndex}`).value = itemData[0].receiver;
      sheet.getCell(`G${rowIndex}`).value = itemData[0].receiverPhone;

      rowIndex++;
    }
  } else if (exportType === 2) {
    for (
      let rowIndex = rowOffset;
      rowIndex < data.length + rowOffset;
      rowIndex++
    ) {
      const previousRow =
        rowIndex === rowOffset ? null : data[rowIndex - rowOffset - 1];
      const currentRow = data[rowIndex - rowOffset];

      sheet.getCell(`A${rowIndex}`).value = rowIndex - rowOffset + 1;
      sheet.getCell(`E${rowIndex}`).value = `련못${num}차-${currentRow.index}`;

      if (currentRow.item) {
        sheet.getCell(`F${rowIndex}`).value = currentRow.item;
      }

      if (!previousRow) {
        // First Row
        sheet.getCell(`B${rowIndex}`).value = currentRow.sender;
        sheet.getCell(`C${rowIndex}`).value = currentRow.company;
        sheet.getCell(`G${rowIndex}`).value = currentRow.receiver;
        sheet.getCell(`H${rowIndex}`).value = currentRow.receiverPhone;
      } else {
        const isNewCompany =
          previousRow.company !== currentRow.company ||
          previousRow.sender !== currentRow.sender;

        if (isNewCompany) {
          sheet.getCell(`B${rowIndex}`).value = currentRow.sender;
          sheet.getCell(`C${rowIndex}`).value = currentRow.company;
          sheet.getCell(`D${newReceiverRowIndex}`).value =
            rowIndex - newReceiverRowIndex;
          sheet.getCell(`G${rowIndex}`).value = currentRow.receiver;
          sheet.getCell(`H${rowIndex}`).value = currentRow.receiverPhone;

          sheet.mergeCells(`B${newCompanyRowIndex}:B${rowIndex - 1}`);
          sheet.mergeCells(`C${newCompanyRowIndex}:C${rowIndex - 1}`);
          sheet.mergeCells(`D${newReceiverRowIndex}:D${rowIndex - 1}`);
          sheet.mergeCells(`G${newReceiverRowIndex}:G${rowIndex - 1}`);
          sheet.mergeCells(`H${newReceiverRowIndex}:H${rowIndex - 1}`);

          newCompanyRowIndex = rowIndex;
          newReceiverRowIndex = rowIndex;
        } else {
          const isNewSender = previousRow.receiver !== currentRow.receiver;
          if (isNewSender) {
            sheet.getCell(`D${newReceiverRowIndex}`).value =
              rowIndex - newReceiverRowIndex;
            sheet.getCell(`G${rowIndex}`).value = currentRow.receiver;
            sheet.getCell(`H${rowIndex}`).value = currentRow.receiverPhone;

            sheet.mergeCells(`D${newReceiverRowIndex}:D${rowIndex - 1}`);
            sheet.mergeCells(`G${newReceiverRowIndex}:G${rowIndex - 1}`);
            sheet.mergeCells(`H${newReceiverRowIndex}:H${rowIndex - 1}`);

            newReceiverRowIndex = rowIndex;
          }
        }
        if (rowIndex === data.length + rowOffset - 1) {
          sheet.getCell(`D${newReceiverRowIndex}`).value =
            rowIndex - newReceiverRowIndex + 1;
          if (newCompanyRowIndex !== rowIndex) {
            sheet.mergeCells(`B${newCompanyRowIndex}:B${rowIndex}`);
            sheet.mergeCells(`C${newCompanyRowIndex}:C${rowIndex}`);
          }
          if (newReceiverRowIndex !== rowIndex) {
            sheet.mergeCells(`D${newReceiverRowIndex}:D${rowIndex}`);
            sheet.mergeCells(`G${newReceiverRowIndex}:G${rowIndex}`);
            sheet.mergeCells(`H${newReceiverRowIndex}:H${rowIndex}`);
          }
        }
      }
    }
  }

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment;`,
    },
  });
}
