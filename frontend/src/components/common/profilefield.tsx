// function ProfileField({
//   icon,
//   label,
//   value,
//   verified,
// }: {
//   icon: React.ReactNode;
//   label: string;
//   value: React.ReactNode;
//   verified?: boolean;
// }) {
//   return (
//     <div className="profile-field">
//       <div className="profile-field-icon">
//         {icon}
//       </div>

//       <div className="profile-field-content">
//         <span>{label}</span>

//         <div className="profile-field-value">
//           <strong>{value}</strong>

//           {verified !== undefined && (
//             <VerificationBadge
//               verified={verified}
//             />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }