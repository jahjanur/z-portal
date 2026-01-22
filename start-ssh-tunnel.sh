#!/bin/bash

# SSH Tunnel Setup Script for ECORE School Database
# This script establishes an SSH tunnel to the school database server

echo "🔐 Setting up SSH tunnel to school database..."
echo ""
echo "SSH Server: 194.149.135.130"
echo "SSH User: t_ecore"
echo "Local Port: 5432 -> Remote: localhost:5432"
echo ""
echo "⚠️  IMPORTANT: Keep this terminal window open while using the database!"
echo "⚠️  The tunnel will close if you close this terminal."
echo ""
echo "Press Ctrl+C to close the tunnel when done."
echo ""
echo "Connecting..."
echo ""

# Establish SSH tunnel
# -N: Don't execute remote commands (tunnel only)
# -L: Local port forwarding
ssh -N -L 5432:localhost:5432 t_ecore@194.149.135.130

echo ""
echo "SSH tunnel closed."
