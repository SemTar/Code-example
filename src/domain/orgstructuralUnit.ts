import { DbClient } from "@dependencies/internal/dbClient";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";

export const getOrgstructuralUnitListByParent = async ({
  dbClient,
  stakeholderId,
  orgstructuralUnitIds,
  isShowDeleted,
}: {
  dbClient: DbClient;
  stakeholderId: string;
  orgstructuralUnitIds: string[];
  isShowDeleted?: boolean;
}): Promise<string[]> => {};

export const getOrgstructuralUnitParentList = async ({
  dbClient,
  stakeholderId,
  orgstructuralUnitIds,
  isShowDeleted,
}: {
  dbClient: DbClient;
  stakeholderId: string;
  orgstructuralUnitIds: string[];
  isShowDeleted?: boolean;
}): Promise<string[]> => {
  if (orgstructuralUnitIds.length === 0) {
    return [];
  }

  const orgstructuralUnitResultIds: string[] = [];

  const orgstructuralUnitCurrentIds: string[] = orgstructuralUnitIds;

  while (orgstructuralUnitCurrentIds.length > 0) {
    orgstructuralUnitResultIds.push(...orgstructuralUnitCurrentIds);

    const orgstructuralUnitList = await new OrgstructuralUnitSearcher(dbClient.getClient(), {
      isShowDeleted: isShowDeleted ?? false,
    }) //
      .filterStakeholderId(stakeholderId)
      .filterIds(orgstructuralUnitCurrentIds)
      .execute();

    orgstructuralUnitCurrentIds.length = 0;

    orgstructuralUnitCurrentIds.push(
      ...orgstructuralUnitList
        .map((item) => item.orgstructuralUnitParentId ?? "0") //
        .filter((chk) => !orgstructuralUnitResultIds.includes(chk))
        .filter((chk) => chk !== "0"),
    );
  }

  return [...new Set(orgstructuralUnitResultIds)];
};
