import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQ() {
  return (
    <section id="faq" className="py-20 w-full max-w-3xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-center mb-8 text-foreground">Frequently Asked Questions</h2>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1" className="border-border">
          <AccordionTrigger className="text-left font-medium">How is the Arc Score calculated?</AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            The Arc Score is an independent reputation metric calculated based on your public on-chain activity. It evaluates factors like total transactions, active days, number of unique contracts interacted with, and engagement with specific DeFi and NFT protocols on the Arc Testnet.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2" className="border-border">
          <AccordionTrigger className="text-left font-medium">Does a high score guarantee an airdrop?</AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            No. This tool is built by the community to help users track their engagement. It does not confirm or guarantee official Arc airdrop eligibility, as the official criteria (if any) are not public.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3" className="border-border">
          <AccordionTrigger className="text-left font-medium">Why is my wallet showing "No Activity"?</AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            If you recently made transactions, it might take some time for the indexer to process them. Ensure you are entering the correct EVM address and that your transactions were successful on the Arc Testnet.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4" className="border-border">
          <AccordionTrigger className="text-left font-medium">Is it safe to paste my address here?</AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            Yes. We only read publicly available blockchain data. The tool never asks you to connect your wallet, sign any messages, or pay any fees.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
