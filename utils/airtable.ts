import Airtable from 'airtable';

const AIRTABLE_TABLE_NAME = 'Crypto Holdings';

export interface PortfolioHolding {
  currency: string;
  amount: number;
}

export async function getPortfolioHoldings(): Promise<PortfolioHolding[]> {
  const airtableToken = process.env.NEXT_PUBLIC_AIRTABLE_TOKEN;
  const airtableBaseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!airtableToken) {
    throw new Error('NEXT_PUBLIC_AIRTABLE_TOKEN is not set in the environment variables');
  }

  if (!airtableBaseId) {
    throw new Error('NEXT_PUBLIC_AIRTABLE_BASE_ID is not set in the environment variables');
  }

  try {
    const base = new Airtable({ apiKey: airtableToken }).base(airtableBaseId);
    const records = await base(AIRTABLE_TABLE_NAME).select().all();
    return records.map(record => ({
      currency: record.get('Currency') as string,
      amount: record.get('Amount') as number,
    }));
  } catch (error) {
    console.error('Error fetching portfolio holdings:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      if (error.message.includes('NOT_AUTHORIZED')) {
        throw new Error('Failed to authorize with Airtable. Please check your NEXT_PUBLIC_AIRTABLE_TOKEN and NEXT_PUBLIC_AIRTABLE_BASE_ID.');
      }
    } else {
      console.error('Unknown error type:', typeof error);
    }
    throw new Error('Failed to fetch portfolio holdings. Please check your Airtable configuration and the browser console for more details.');
  }
}

