"""
Usage:
    python manage.py seed          # insert sample data
    python manage.py seed --flush  # wipe & re-seed
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the database with realistic sample data"

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete existing data before seeding")

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        self.stdout.write("Seeding states & districts...")
        states = self._seed_deployment()

        self.stdout.write("Seeding employees...")
        employees = self._seed_employees(states)

        self.stdout.write("Seeding attendance...")
        self._seed_attendance(employees)

        self.stdout.write("Seeding salary structures...")
        self._seed_salary(employees)

        self.stdout.write("Seeding recruitment...")
        self._seed_recruitment(states)

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! {len(employees)} employees, "
            f"{sum(len(s['sites']) for s in states)} sites across {len(states)} states."
        ))

    # ─────────────────────────────────────────────────────────────
    def _flush(self):
        from apps.compliance.models import PFContribution, ESIContribution, ChallanRun
        from apps.payroll.models import Payslip, PayrollRun, SalaryStructure
        from apps.attendance.models import Attendance
        from apps.recruitment.models import Candidate, Requisition
        from apps.employees.models import Employee, EmployeeDocument
        from apps.deployment.models import Site, District, State

        for M in [ChallanRun, ESIContribution, PFContribution, Payslip, PayrollRun,
                  SalaryStructure, Attendance, Candidate, Requisition,
                  EmployeeDocument, Employee, Site, District, State]:
            M.objects.all().delete()
        self.stdout.write("Flushed existing data.")

    # ─────────────────────────────────────────────────────────────
    def _seed_deployment(self):
        from apps.deployment.models import State, District, Site

        DATA = [
            {
                "state": "Delhi",
                "districts": [
                    {"name": "Central Delhi", "sites": [
                        {"name": "Delhi Secretariat", "lat": 28.6139, "lng": 77.2090, "strength": 180},
                        {"name": "DDA Head Office", "lat": 28.6200, "lng": 77.2100, "strength": 60},
                    ]},
                    {"name": "New Delhi", "sites": [
                        {"name": "NDMC Office", "lat": 28.6280, "lng": 77.2160, "strength": 45},
                    ]},
                ],
            },
            {
                "state": "Uttar Pradesh",
                "districts": [
                    {"name": "Gautam Buddh Nagar", "sites": [
                        {"name": "Noida Sector 62 Office", "lat": 28.6271, "lng": 77.3716, "strength": 140},
                        {"name": "Noida Authority Building", "lat": 28.5900, "lng": 77.3200, "strength": 80},
                    ]},
                    {"name": "Lucknow", "sites": [
                        {"name": "Lucknow Govt Hospital", "lat": 26.8467, "lng": 80.9462, "strength": 110},
                        {"name": "Lucknow Collectorate", "lat": 26.8500, "lng": 80.9300, "strength": 55},
                    ]},
                    {"name": "Kanpur Nagar", "sites": [
                        {"name": "Kanpur District Court", "lat": 26.4499, "lng": 80.3319, "strength": 80},
                    ]},
                ],
            },
            {
                "state": "Haryana",
                "districts": [
                    {"name": "Gurugram", "sites": [
                        {"name": "Gurugram Mini Secretariat", "lat": 28.4595, "lng": 77.0266, "strength": 120},
                    ]},
                    {"name": "Faridabad", "sites": [
                        {"name": "Faridabad Bus Depot", "lat": 28.4089, "lng": 77.3178, "strength": 95},
                    ]},
                ],
            },
            {
                "state": "Rajasthan",
                "districts": [
                    {"name": "Jaipur", "sites": [
                        {"name": "Jaipur Collectorate", "lat": 26.9124, "lng": 75.7873, "strength": 70},
                    ]},
                ],
            },
        ]

        result = []
        for entry in DATA:
            state, _ = State.objects.get_or_create(name=entry["state"])
            state_sites = []
            for d_data in entry["districts"]:
                district, _ = District.objects.get_or_create(name=d_data["name"], state=state)
                for s_data in d_data["sites"]:
                    site, _ = Site.objects.get_or_create(
                        name=s_data["name"],
                        defaults={
                            "district": district,
                            "lat": s_data["lat"],
                            "lng": s_data["lng"],
                            "geofence_radius": 200,
                            "sanctioned_strength": s_data["strength"],
                        },
                    )
                    state_sites.append(site)
            result.append({"state": state, "sites": state_sites})
        return result

    # ─────────────────────────────────────────────────────────────
    def _seed_employees(self, states):
        from apps.deployment.models import Site
        from apps.employees.models import Employee

        DESIGNATIONS = [
            ("Security Guard", 70),
            ("Housekeeping", 15),
            ("Driver", 8),
            ("Data Entry Operator", 5),
            ("Site Supervisor", 2),
        ]

        FIRST_NAMES = [
            "Ramesh", "Suresh", "Mahesh", "Dinesh", "Rajesh", "Mukesh",
            "Pooja", "Sunita", "Kavita", "Reena", "Anita", "Geeta",
            "Anil", "Vikas", "Sanjay", "Vijay", "Deepak", "Rohit",
            "Priya", "Neha", "Ritu", "Shivam", "Amit", "Rahul",
            "Mohit", "Sachin", "Naresh", "Kamlesh", "Bhavesh", "Jitendra",
        ]
        LAST_NAMES = [
            "Kumar", "Singh", "Sharma", "Yadav", "Verma", "Gupta",
            "Mishra", "Tiwari", "Pandey", "Dubey", "Chauhan", "Negi",
            "Joshi", "Patel", "Shah", "Lal", "Das", "Pal",
        ]

        all_sites = Site.objects.all()
        employees = []
        emp_num = 1000

        for site in all_sites:
            count = min(site.sanctioned_strength, 30)  # cap at 30 per site for seed
            for _ in range(count):
                desig = random.choices(
                    [d[0] for d in DESIGNATIONS],
                    weights=[d[1] for d in DESIGNATIONS],
                )[0]
                fname = random.choice(FIRST_NAMES)
                lname = random.choice(LAST_NAMES)
                full_name = f"{fname} {lname}"
                emp_num += 1
                emp_code = f"EMP-{emp_num}"
                phone = f"9{random.randint(100000000, 999999999)}"
                doj = date(2023, 1, 1) + timedelta(days=random.randint(0, 540))
                status = random.choices(
                    ["active", "on_leave", "inactive"],
                    weights=[88, 9, 3],
                )[0]

                emp, created = Employee.objects.get_or_create(
                    emp_code=emp_code,
                    defaults={
                        "full_name": full_name,
                        "phone": phone,
                        "designation": desig,
                        "site": site,
                        "date_joined": doj,
                        "status": status,
                        "uan": f"10{random.randint(10000000000, 99999999999)}",
                    },
                )
                if created:
                    employees.append(emp)

        self.stdout.write(f"  Created {len(employees)} employees")
        return employees

    # ─────────────────────────────────────────────────────────────
    def _seed_attendance(self, employees):
        from apps.attendance.models import Attendance

        today = date.today()
        records = []

        for emp in employees:
            if emp.status == "inactive":
                continue
            # last 30 days
            for days_ago in range(30, -1, -1):
                d = today - timedelta(days=days_ago)
                if d.weekday() == 6:  # skip Sundays
                    continue
                roll = random.random()
                if roll < 0.05:     # 5% absent
                    continue
                elif roll < 0.10:   # 5% review/geofence issue
                    status = "review"
                    geofence_ok = False
                elif roll < 0.15:   # 5% late
                    status = "late"
                    geofence_ok = True
                else:
                    status = "present"
                    geofence_ok = True

                records.append(Attendance(
                    employee=emp,
                    date=d,
                    check_in_time=f"0{random.randint(8,9)}:{random.randint(10,59):02d}",
                    lat=emp.site.lat if emp.site else None,
                    lng=emp.site.lng if emp.site else None,
                    geofence_ok=geofence_ok,
                    status=status,
                    site=emp.site,
                ))

        Attendance.objects.bulk_create(records, ignore_conflicts=True)
        self.stdout.write(f"  Created {len(records)} attendance records")

    # ─────────────────────────────────────────────────────────────
    def _seed_salary(self, employees):
        from apps.payroll.models import SalaryStructure

        SALARY_MAP = {
            "Security Guard":       (18000, 2000, 1500, 700),
            "Housekeeping":         (15000, 1800, 1200, 500),
            "Driver":               (20000, 2500, 2000, 800),
            "Data Entry Operator":  (16000, 2000, 1500, 600),
            "Site Supervisor":      (24000, 4000, 3000, 1000),
        }

        structs = []
        for emp in employees:
            if SalaryStructure.objects.filter(employee=emp).exists():
                continue
            basic, hra, da, other = SALARY_MAP.get(emp.designation, (15000, 1800, 1200, 500))
            # small random variation ±5%
            factor = random.uniform(0.95, 1.05)
            structs.append(SalaryStructure(
                employee=emp,
                basic=round(basic * factor),
                hra=round(hra * factor),
                da=round(da * factor),
                other_allowances=round(other * factor),
            ))

        SalaryStructure.objects.bulk_create(structs, ignore_conflicts=True)
        self.stdout.write(f"  Created {len(structs)} salary structures")

    # ─────────────────────────────────────────────────────────────
    def _seed_recruitment(self, states):
        from apps.deployment.models import Site
        from apps.recruitment.models import Requisition, Candidate

        STAGES = ["applied", "screened", "interview", "selected", "rejected"]
        WEIGHTS = [40, 25, 15, 12, 8]
        DESIGS = ["Security Guard", "Housekeeping", "Driver", "Data Entry Operator"]
        NAMES = [
            "Rohit Verma", "Kavita Singh", "Manoj Lal", "Sanjay Mishra",
            "Reena Devi", "Arun Pandey", "Geeta Kumari", "Praveen Joshi",
            "Lakshmi Bai", "Devendra Yadav", "Manju Sharma", "Ravi Gupta",
        ]

        site = Site.objects.first()
        if not site:
            return

        req, _ = Requisition.objects.get_or_create(
            site=site,
            designation="Security Guard",
            defaults={"count_required": 10, "is_open": True},
        )

        candidates = []
        for name in NAMES:
            stage = random.choices(STAGES, weights=WEIGHTS)[0]
            candidates.append(Candidate(
                requisition=req,
                full_name=name,
                phone=f"9{random.randint(100000000, 999999999)}",
                designation=random.choice(DESIGS),
                experience_years=random.randint(0, 8),
                stage=stage,
            ))

        Candidate.objects.bulk_create(candidates, ignore_conflicts=True)
        self.stdout.write(f"  Created {len(candidates)} candidates")
