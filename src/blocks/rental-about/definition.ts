import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const rentalAboutBlock = {
  type: BlockType.RENTAL_ABOUT,
  label: "About",
  shortLabel: "A",
  category: "Rental car",
  order: 14,
  defaultContent: {
    heading: "Why Choose Us?",
    description:
      "At City Car Rental, we're not just another company. We're your neighbors. As a family-owned and operated business, we've been proudly serving our community for many years.",
    carName: "OPEL CORSA 1.2T",
    carImage: "/city-rent/opel-corsa.png",
    carPrice: "45",
    carGroup: "Group B",
    carLink: "/booking/options-selection",
    features: [
      {
        title: "Safety & Trust",
        description: "Your security is our priority. We prioritize safe practices and reliable methods.",
        path: "/city-rent/safety-certificate.svg",
      },
      {
        title: "Local Expertise",
        description: "We understand the local landscape and provide tailored solutions for your trip.",
        path: "/city-rent/manager-avatar.svg",
      },
      {
        title: "Family Values",
        description: "We treat customers like family with open communication and honest estimates.",
        path: "/city-rent/call-center-operator.svg",
      },
    ],
  },
  schema: z
    .object({
      heading: z.string(),
      description: optionalString,
      carName: optionalString,
      carImage: optionalString,
      carPrice: optionalString,
      carGroup: optionalString,
      carLink: optionalString,
      features: z.array(
        z
          .object({
            title: z.string(),
            description: z.string(),
            path: optionalString,
          })
          .passthrough(),
      ),
    })
    .passthrough(),
  fields: [
    { id: "heading", label: "Heading", type: "text" },
    { id: "description", label: "Description", type: "textarea", rows: 4 },
    { id: "carName", label: "Featured Car Name", type: "text" },
    { id: "carImage", label: "Featured Car Image", type: "image" },
    { id: "carPrice", label: "Featured Car Price", type: "text" },
    { id: "carGroup", label: "Featured Car Group", type: "text" },
    { id: "carLink", label: "Featured Car Link", type: "url" },
    {
      id: "features",
      label: "Features",
      type: "repeater",
      addLabel: "Add Feature",
      defaultItem: { title: "Feature", description: "Describe the feature.", path: "" },
      fields: [
        { id: "title", label: "Title", type: "text" },
        { id: "description", label: "Description", type: "textarea", rows: 3 },
        { id: "path", label: "Icon", type: "image" },
      ],
    },
  ],
} satisfies BlockDefinition;

export default rentalAboutBlock;
