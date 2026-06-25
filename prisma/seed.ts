/**
 * Seed script — creates 12 refinery units with employees and leave requests.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Employee type
// ---------------------------------------------------------------------------
type EmpDef = {
  name: string;
  competencyLevel: number;
  doesRotatingShift: boolean;
  eligibleGShift: boolean;
  eligibleTwelveHr: boolean;
  givesLeaveBackup: boolean;
};

type LeaveDef = {
  employeeIndex: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
};

type UnitDef = {
  name: string;
  personsPerShift: number;
  shiftsPerDay: number;
  weeklyOffDays: number;
  minRestHours: number;
  maxConsecutiveWorkDays: number;
  minConsecutiveWorkDays: number;
  employees: EmpDef[];
  leaves: LeaveDef[];
};

// ---------------------------------------------------------------------------
// Units & Employees
// ---------------------------------------------------------------------------

const UNITS: UnitDef[] = [
  {
    name: "HCU",
    personsPerShift: 3,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Rajesh Kumar Sharma",  competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Anil Kumar Verma",     competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Suresh Chandra Gupta", competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Pramod Singh Rawat",   competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Deepak Joshi",         competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Ramesh Prasad Yadav",  competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Vinod Kumar Tiwari",   competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Sanjay Mishra",        competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Mukesh Pandey",        competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Ashok Tiwari",         competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Ravi Shankar Dubey",   competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 3, startDate: isoDate(2026, 7, 7),  endDate: isoDate(2026, 7, 11), reason: "Annual leave",  status: "PLANNED"   },
      { employeeIndex: 6, startDate: isoDate(2026, 7, 21), endDate: isoDate(2026, 7, 25), reason: "Medical",       status: "EMERGENCY" },
      { employeeIndex: 1, startDate: isoDate(2026, 8, 4),  endDate: isoDate(2026, 8, 8),  reason: "Family event", status: "PLANNED"   },
    ],
  },
  {
    name: "H2U",
    personsPerShift: 2,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Brijesh Nath Tripathi", competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Naresh Kumar Singh",    competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Dinesh Prasad",         competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Umesh Chandra Shukla",  competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Kamlesh Yadav",         competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Santosh Kumar Bind",    competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Virendra Kushwaha",     competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Mahesh Pal",            competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 2, startDate: isoDate(2026, 7, 14), endDate: isoDate(2026, 7, 18), reason: "Annual leave", status: "PLANNED"   },
      { employeeIndex: 5, startDate: isoDate(2026, 8, 11), endDate: isoDate(2026, 8, 13), reason: "Medical",      status: "EMERGENCY" },
    ],
  },
  {
    name: "CDU",
    personsPerShift: 3,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Pradeep Kumar Jain",    competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Hemant Singh Negi",     competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Govind Ram Patel",      competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Arvind Kumar Pathak",   competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Shiv Prasad Maurya",    competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Tejpal Singh",          competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Neeraj Kumar Srivastava", competencyLevel: 2, doesRotatingShift: true, eligibleGShift: true, eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Rohit Verma",           competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Sachin Kumar Dixit",    competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Vijay Shankar Bajpai",  competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Arun Kumar Pal",        competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 4, startDate: isoDate(2026, 7, 7),  endDate: isoDate(2026, 7, 9),  reason: "Medical",      status: "EMERGENCY" },
      { employeeIndex: 7, startDate: isoDate(2026, 7, 21), endDate: isoDate(2026, 7, 25), reason: "Annual leave", status: "PLANNED"   },
      { employeeIndex: 2, startDate: isoDate(2026, 8, 4),  endDate: isoDate(2026, 8, 8),  reason: "Annual leave", status: "PLANNED"   },
    ],
  },
  {
    name: "VDU",
    personsPerShift: 3,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Rakesh Chandra Joshi",  competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Pankaj Kumar Sahu",     competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Shailendra Nath Pandey", competencyLevel: 4, doesRotatingShift: true, eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Rajiv Kumar Sharma",    competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Satendra Singh",        competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Harendra Prasad",       competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Jitendra Yadav",        competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Ritesh Kumar Dubey",    competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Alok Nath Verma",       competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Subodh Kumar Tiwari",   competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 3, startDate: isoDate(2026, 7, 14), endDate: isoDate(2026, 7, 18), reason: "Annual leave", status: "PLANNED"   },
      { employeeIndex: 6, startDate: isoDate(2026, 8, 3),  endDate: isoDate(2026, 8, 5),  reason: "Medical",      status: "EMERGENCY" },
    ],
  },
  {
    name: "MSP",
    personsPerShift: 2,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Manoj Kumar Aggarwal",  competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Devendra Singh Chauhan", competencyLevel: 4, doesRotatingShift: true, eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Sunil Kumar Rai",       competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Rahul Singh Thakur",    competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Vivek Kumar Pandey",    competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Pravin Nath Chaturvedi", competencyLevel: 2, doesRotatingShift: true, eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Ankit Rastogi",         competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Kapil Dev Mishra",      competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 2, startDate: isoDate(2026, 7, 21), endDate: isoDate(2026, 7, 25), reason: "Annual leave", status: "PLANNED"   },
      { employeeIndex: 5, startDate: isoDate(2026, 8, 11), endDate: isoDate(2026, 8, 11), reason: "Medical",      status: "EMERGENCY" },
    ],
  },
  {
    name: "DCU",
    personsPerShift: 3,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Yogesh Kumar Srivastava", competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true, eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Awadhesh Pratap Singh",  competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Narendra Kumar Mishra",  competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Vimlesh Yadav",          competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Dharmendra Kushwaha",    competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Krishnakant Shukla",     competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Brijlal Prajapati",      competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Ramkrishna Tiwari",      competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Laxman Das Gupta",       competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Chandrabhan Singh",      competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 3, startDate: isoDate(2026, 7, 7),  endDate: isoDate(2026, 7, 11), reason: "Annual leave", status: "PLANNED"   },
      { employeeIndex: 7, startDate: isoDate(2026, 7, 28), endDate: isoDate(2026, 7, 30), reason: "Medical",      status: "EMERGENCY" },
    ],
  },
  {
    name: "OM&S",
    personsPerShift: 3,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Jagdish Prasad Bajpai",  competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Ramnaresh Yadav",        competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Shyamlal Vishwakarma",   competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Radheshyam Pandey",      competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Harishankar Misra",      competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Kamta Prasad Verma",     competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Siyaram Singh",          competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Tribhuvan Kumar",        competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Durgesh Nath Ojha",      competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Bachcha Lal Patel",      competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Girish Chandra Pathak",  competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 4, startDate: isoDate(2026, 7, 14), endDate: isoDate(2026, 7, 18), reason: "Annual leave", status: "PLANNED"   },
      { employeeIndex: 8, startDate: isoDate(2026, 8, 4),  endDate: isoDate(2026, 8, 8),  reason: "Family event", status: "PLANNED"   },
    ],
  },
  {
    name: "ASPU",
    personsPerShift: 2,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Kailash Nath Dubey",    competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Subhash Chandra Yadav", competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Ramesh Babu Rastogi",   competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Prem Shankar Gupta",    competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Harish Kumar Awasthi",  competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Surendra Nath Singh",   competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Avinash Kumar Tiwari",  competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Srikant Shukla",        competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 3, startDate: isoDate(2026, 7, 21), endDate: isoDate(2026, 7, 25), reason: "Annual leave", status: "PLANNED"   },
    ],
  },
  {
    name: "DHDT",
    personsPerShift: 3,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Ramashankar Tripathi",  competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Ganesh Prasad Pandey",  competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Nagendra Nath Shukla",  competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Bhagwan Das Maurya",    competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Phool Chand Yadav",     competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Kalawati Prasad",       competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Omkar Nath Mishra",     competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Shiv Nath Patel",       competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Ram Bharose Gupta",     competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Babulal Verma",         competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Jagmohan Lal Singh",    competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 2, startDate: isoDate(2026, 7, 7),  endDate: isoDate(2026, 7, 11), reason: "Annual leave", status: "PLANNED"   },
      { employeeIndex: 5, startDate: isoDate(2026, 8, 3),  endDate: isoDate(2026, 8, 7),  reason: "Annual leave", status: "PLANNED"   },
    ],
  },
  {
    name: "SRB",
    personsPerShift: 2,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Satyanarayan Chaturvedi", competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true, eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Brij Bhushan Srivastava", competencyLevel: 4, doesRotatingShift: true, eligibleGShift: true, eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Deendayal Upadhyay",     competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Ramprasad Nishad",       competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Ishwar Dayal Kori",      competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Shivanand Pal",          competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Nanhe Lal Yadav",        competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Rajkumar Bind",          competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 3, startDate: isoDate(2026, 7, 14), endDate: isoDate(2026, 7, 18), reason: "Annual leave", status: "PLANNED"   },
      { employeeIndex: 6, startDate: isoDate(2026, 8, 11), endDate: isoDate(2026, 8, 12), reason: "Medical",      status: "EMERGENCY" },
    ],
  },
  {
    name: "SDU",
    personsPerShift: 2,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Bhola Nath Kesarwani",  competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Guddu Prasad Maurya",   competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Munna Lal Prajapati",   competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Lallan Singh Yadav",    competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Bachchu Lal Vishwakarma", competencyLevel: 2, doesRotatingShift: true, eligibleGShift: false, eligibleTwelveHr: true, givesLeaveBackup: false },
      { name: "Gokaran Prasad",        competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Balram Das",            competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Dhananjay Kumar Singh", competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 2, startDate: isoDate(2026, 7, 21), endDate: isoDate(2026, 7, 24), reason: "Annual leave", status: "PLANNED"   },
    ],
  },
  {
    name: "WHFU",
    personsPerShift: 2,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Ramchandra Prasad Yadav", competencyLevel: 5, doesRotatingShift: false, eligibleGShift: true, eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Shivkumar Nath",          competencyLevel: 4, doesRotatingShift: true,  eligibleGShift: true, eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Pannalal Singh",          competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Hariom Shukla",           competencyLevel: 3, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Chandrika Prasad Mishra", competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Tarkeshwar Singh",        competencyLevel: 2, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Awadhesh Kumar Gupta",    competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Prakash Narayan Pandey",  competencyLevel: 1, doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 4, startDate: isoDate(2026, 7, 14), endDate: isoDate(2026, 7, 18), reason: "Annual leave", status: "PLANNED"   },
      { employeeIndex: 1, startDate: isoDate(2026, 8, 4),  endDate: isoDate(2026, 8, 6),  reason: "Medical",      status: "EMERGENCY" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding database…");

  // Wipe all data in dependency order
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.feasibilityFlag.deleteMany();
  await prisma.finalizedSchedule.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.unit.deleteMany();

  for (const unitDef of UNITS) {
    const { employees: empDefs, leaves: leaveDefs, ...unitFields } = unitDef;

    const unit = await prisma.unit.create({ data: unitFields });
    console.log(`  Created unit: ${unit.name}`);

    const employees = await Promise.all(
      empDefs.map((emp, idx) =>
        prisma.employee.create({
          data: {
            unitId:             unit.id,
            seniorityIndex:     idx,
            name:               emp.name,
            competencyLevel:    emp.competencyLevel,
            doesRotatingShift:  emp.doesRotatingShift,
            eligibleGShift:     emp.eligibleGShift,
            eligibleTwelveHr:   emp.eligibleTwelveHr,
            givesLeaveBackup:   emp.givesLeaveBackup,
          },
        })
      )
    );
    console.log(`    ${employees.length} employees`);

    for (const lv of leaveDefs) {
      const emp = employees[lv.employeeIndex];
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          startDate:  new Date(lv.startDate),
          endDate:    new Date(lv.endDate),
          reason:     lv.reason,
          status:     lv.status,
        },
      });
    }
    console.log(`    ${leaveDefs.length} leave requests`);
  }

  // Create users
  const allUnits = await prisma.unit.findMany({ orderBy: { createdAt: "asc" } });

  await prisma.user.create({ data: { username: "admin", password: "admin123", role: "ADMIN" } });
  console.log("  Created user: admin (ADMIN, all units)");

  for (const unit of allUnits) {
    // username = unit name lowercased, special chars stripped
    const username = unit.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    await prisma.user.create({
      data: { username, password: "password", role: "UNIT_USER", unitId: unit.id },
    });
    console.log(`  Created user: ${username} → ${unit.name}`);
  }

  console.log("\nDone.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
