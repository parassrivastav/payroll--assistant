# Demo Script

1. Start backend:

```bash
cd backend
npm start
```

2. Start frontend:

```bash
cd frontend
npm run dev
```

3. Open the dashboard and use the mock login selector.

4. Upload a payslip through the chat composer.

5. Show the salary summary cards:

- Gross Pay
- Net Pay
- Total Earnings
- Total Deductions

6. Show salary breakdown, YTD values, and validation warnings.

7. Show Month Comparison for current and previous month.

8. Ask a question such as:

```text
Why is my net salary lower?
```

9. Show that the answer cites available payslip sources.

10. Run the 80C simulator and explain that the assumptions are simplified and not tax advice.

11. Show the investment proof checklist and missing proof summary.

12. Show the saved UI screenshot in `docs/screenshots/dashboard.png` for evaluator documentation.

13. Optionally demonstrate ownership:

- Login as `emp_001`.
- Try accessing `emp_002` data with `employeeId=emp_002`.
- Backend returns `403`.
