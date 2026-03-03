import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // This data visually mimics your Xero screenshot so we can nail the design
    const mockXeroData = [
      { month: "Oct", cashIn: 280000, cashOut: 220000 },
      { month: "Nov", cashIn: 300000, cashOut: 350000 },
      { month: "Dec", cashIn: 500000, cashOut: 210000 },
      { month: "Jan", cashIn: 320000, cashOut: 180000 },
      { month: "Feb", cashIn: 50000, cashOut: 150000 },
      { month: "Mar", cashIn: 0, cashOut: 40000 },
    ];

    return NextResponse.json(mockXeroData);
    
  } catch (error) {
    console.error("Xero API Error:", error);
    return NextResponse.json({ error: "Failed to fetch Xero data" }, { status: 500 });
  }
}