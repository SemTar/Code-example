import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
  VACANCY_RESPONSE_COLUMN_LIST,
} from "@constants/vacancyResponse";
import * as errors from "@errors/index";
import {
  Vacancy, //
  VacancyResponse,
} from "@models/index";
import { VacancySearcher } from "@store/vacancySearcher";

const getVacancyResponseCountDelta = (
  desirableVacancyResponse: VacancyResponse,
  existingVacancyResponse: VacancyResponse | undefined | null,
  candidateStateMnemocodeList: string[],
): number => {
  let responseCountDelta = 0;
  if (
    (!existingVacancyResponse ||
      existingVacancyResponse.dateDeleted !== null ||
      candidateStateMnemocodeList.length === 0 ||
      !candidateStateMnemocodeList.includes(existingVacancyResponse.candidateStateMnemocode)) &&
    desirableVacancyResponse.dateDeleted === null &&
    (candidateStateMnemocodeList.length === 0 ||
      candidateStateMnemocodeList.includes(desirableVacancyResponse.candidateStateMnemocode))
  ) {
    responseCountDelta++;
  }
  if (
    existingVacancyResponse &&
    existingVacancyResponse.dateDeleted === null &&
    (candidateStateMnemocodeList.length === 0 ||
      candidateStateMnemocodeList.includes(existingVacancyResponse.candidateStateMnemocode)) &&
    (desirableVacancyResponse.dateDeleted !== null ||
      candidateStateMnemocodeList.length === 0 ||
      !candidateStateMnemocodeList.includes(desirableVacancyResponse.candidateStateMnemocode))
  ) {
    responseCountDelta--;
  }

  return responseCountDelta;
};

export const vacancyResponseSave = async (
  desirableVacancyResponse: VacancyResponse,
  existingVacancyResponse: VacancyResponse | undefined | null,
  usrAccId: string | null,
  columns?: string[],
): Promise<void> => {
  const knex = desirableVacancyResponse.getKnex();

  if (existingVacancyResponse && existingVacancyResponse.vacancyId !== desirableVacancyResponse.vacancyId) {
    // Смена вакансии по отклику не предусмотрена.
    throw new errors.GenericUnreachableBlock({ info: "Попытка поменять вакансию по отклику." });
  }

  const responseCountDelta = getVacancyResponseCountDelta(desirableVacancyResponse, existingVacancyResponse, []);
  const responseWaitingForSupervisorCountDelta = getVacancyResponseCountDelta(
    desirableVacancyResponse, //
    existingVacancyResponse,
    [VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT],
  );
  const responseOfferCountDelta = getVacancyResponseCountDelta(
    desirableVacancyResponse, //
    existingVacancyResponse,
    [VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER],
  );

  if (responseCountDelta !== 0 || responseWaitingForSupervisorCountDelta !== 0 || responseOfferCountDelta !== 0) {
    const existingVacancy = await new VacancySearcher(desirableVacancyResponse.getKnex()) //
      .filterId(desirableVacancyResponse.vacancyId)
      .executeForOne();

    if (existingVacancy?.id) {
      const desirableVacancy = new Vacancy(knex).fromJSON({
        ...existingVacancy,
        responseCount: existingVacancy.responseCount + responseCountDelta,
        responseWaitingForSupervisorCount:
          existingVacancy.responseWaitingForSupervisorCount + responseWaitingForSupervisorCountDelta,
        responseOfferCount: existingVacancy.responseOfferCount + responseOfferCountDelta,
      });

      await desirableVacancy.update(existingVacancy, {
        usrAccChangesId: usrAccId,
        columns: [
          Vacancy.columns.responseCount,
          Vacancy.columns.responseWaitingForSupervisorCount,
          Vacancy.columns.responseOfferCount,
        ],
      });
    }
  }

  if (existingVacancyResponse) {
    if (existingVacancyResponse.dateDeleted === null && desirableVacancyResponse.dateDeleted !== null) {
      await desirableVacancyResponse.delete({ usrAccChangesId: usrAccId });
    }
    if (existingVacancyResponse.dateDeleted !== null && desirableVacancyResponse.dateDeleted === null) {
      await desirableVacancyResponse.restore({ usrAccChangesId: usrAccId });
    }

    await desirableVacancyResponse.update(existingVacancyResponse, {
      usrAccChangesId: usrAccId,
      columns: columns ?? VACANCY_RESPONSE_COLUMN_LIST,
    });
  } else {
    if (desirableVacancyResponse.dateDeleted !== null) {
      await desirableVacancyResponse.delete({ usrAccChangesId: usrAccId });
    } else {
      await desirableVacancyResponse.insert({
        usrAccCreationId: usrAccId,
      });
    }
  }
};
