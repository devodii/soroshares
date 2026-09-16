export interface KycSubmission {
  first_name: string;
  last_name: string;
  birth_date: string;
  address_country_code: string;
  bank_account_number: string;
  email_address: string;
}

export interface KycDecision {
  status: "ACCEPTED" | "REJECTED";
  message?: string;
}

const BVN_PATTERN = /^\d{11}$/;
const MIN_AGE_YEARS = 18;

function age(birthDate: string, now: Date): number {
  const dob = new Date(birthDate);
  let years = now.getFullYear() - dob.getFullYear();
  const monthDay = now.getMonth() - dob.getMonth() || now.getDate() - dob.getDate();
  if (monthDay < 0) years -= 1;
  return years;
}

export function decide(submission: KycSubmission, now = new Date()): KycDecision {
  if (!BVN_PATTERN.test(submission.bank_account_number)) {
    return { status: "REJECTED", message: "BVN must be exactly 11 digits" };
  }
  if (Number.isNaN(new Date(submission.birth_date).getTime())) {
    return { status: "REJECTED", message: "invalid date of birth" };
  }
  if (age(submission.birth_date, now) < MIN_AGE_YEARS) {
    return { status: "REJECTED", message: "must be at least 18 years old" };
  }
  if (!submission.address_country_code) {
    return { status: "REJECTED", message: "country is required" };
  }
  return { status: "ACCEPTED" };
}
