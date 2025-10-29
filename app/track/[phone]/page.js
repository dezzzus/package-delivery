import { getPackages, getOrderColors } from "../../../lib/utils";

export default async function TrackPage({ params }) {
  const { phone } = params;

  try {
    const packages = await getPackages(phone);
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Your Packages</h2>
          {packages.length === 0 ? (
            <p className="text-gray-500">
              No packages found for this phone number.
            </p>
          ) : (
            <div className="space-y-4">
              {packages
                .filter((pkg) => pkg.isVisible)
                .map((pkg, index) => {
                  const colors = getOrderColors(pkg.orderIndex);
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg shadow border ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex-1">
                        {pkg.title && (
                          <p
                            className={`text-lg font-medium ${colors.text} mb-3`}
                          >
                            {pkg.title_name}: {pkg.title}
                          </p>
                        )}
                        {/* Display display column data */}
                        {Object.entries(pkg).map(([key, value]) => {
                          if (
                            key !== "orderIndex" &&
                            key !== "lastEdited" &&
                            key !== "title" &&
                            key !== "title_name" &&
                            key !== pkg["title_name"] &&
                            key !== "isVisible" &&
                            value
                          ) {
                            return (
                              <p
                                key={key}
                                className={`text-base ${colors.statusText}`}
                              >
                                {key}: {value}
                              </p>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching packages:", error);
    return (
      <div className="max-w-2xl mx-auto">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Error</h2>
          <p className="text-red-500">
            Failed to load packages. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
/**
export default async function TrackPage({ params }) {
  const { phone } = params;

  try {
    const packages = await getPackages(phone);
    const gropuedPackagesByDelieverNumber =
      getGropuedPackagesByDelieverNumber(packages);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="space-y-4">
          {packages.length === 0 ? (
            <p className="text-gray-500">
              No packages found for this phone number.
            </p>
          ) : (
            <div className="space-y-4">
              <h5 className={`text-lg font-bold mb-3`}>
                단위명: {packages[0].company}
              </h5>
              {gropuedPackagesByDelieverNumber.map(
                (dNPackages, groupedIndex) => {
                  const gropuedPackages =
                    getGropuedPackagesByStatus(dNPackages);
                  console.log(
                    `====================${groupedIndex}`,
                    gropuedPackages
                  );
                  const renderer = gropuedPackages
                    .slice(1)
                    .map((pkg, index) => {
                      const readablePackageList = compressIndices(pkg);
                      const colors = getStatusColors(pkg[0].statusColor);
                      return (
                        <AccordionItem
                          key={`accordion-item-${groupedIndex}-${index}`}
                          className={`border ${colors.bg} ${colors.border} mb-2`}
                          value={deliveryStatus[pkg[0].status]}
                        >
                          <AccordionTrigger
                            className={`w-full text-left text-base ${colors.statusText} px-2`}
                          >
                            {pkg[0].status}({pkg.length})
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className={`text-base ${colors.statusText}`}>
                              <b>물자번호: {readablePackageList}</b>
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    });
                  const totalCount = gropuedPackages[0][0].index;
                  const deliverCount = gropuedPackages
                    .slice(1)
                    .reduce((accum, cur) => accum + cur.length, 0);

                  return (
                    <>
                      <h6
                        key={`deliver-number-${groupedIndex}`}
                        className={`text-md font-bold mb-1`}
                      >
                        발송차수: {dNPackages[0].deliverNumber}
                      </h6>
                      <p
                        key={`deliver-accum-${groupedIndex}`}
                        className={`text-md font-medium mb-3`}
                      >
                        총짝수: {totalCount}, 창고재고:{" "}
                        {totalCount - deliverCount}, 출하짝수: {deliverCount}
                      </p>
                      {gropuedPackages.length > 1 ? (
                        <AccordionRoot
                          key={`deliver-accordion-${groupedIndex}`}
                          className="AccordionRoot"
                          type="single"
                          defaultValue={
                            deliveryStatus[gropuedPackages[1][0].status]
                          }
                          collapsible
                        >
                          {renderer}
                        </AccordionRoot>
                      ) : null}
                    </>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching packages:", error);
    return (
      <div className="max-w-2xl mx-auto">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Error</h2>
          <p className="text-red-500">
            Failed to load packages. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
*/
